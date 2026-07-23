import { getUsdToZmwRate } from "@/lib/currency-rates";
import { convertCurrency, getSiteCurrency, resolveDisplayCurrency } from "@/lib/currency";
import { createServiceClient } from "@/lib/supabase/server";
import type { LedgerEntry, Payment } from "@/types/database";

export interface LedgerSummary {
  balance: number;
  totalIn: number;
  totalOut: number;
  currency: string;
  entries: LedgerEntry[];
}

export interface MerchantAccountingSummary extends LedgerSummary {
  customerWalletLiability: number;
  platformFeesEarned: number;
  walletOrderCount: number;
  walletOrderVolume: number;
  /** Completed wallet tool purchases — merchant processed revenue */
  processedSalesVolume: number;
  /** Confirmed customer deposits (held as prepaid credit, not merchant revenue) */
  depositsReceivedTotal: number;
  depositCount: number;
}

function toDisplayAmount(
  amount: number,
  fromCurrency: string | null | undefined,
  displayCurrency: string,
  rate: number | null
): number {
  return convertCurrency(amount, fromCurrency, displayCurrency, rate);
}

export async function recordPaymentLedger(payment: Payment) {
  const supabase = createServiceClient();
  if (!supabase || payment.status !== "completed") return;

  const { data: existing } = await supabase
    .from("ledger_entries")
    .select("id")
    .eq("payment_id", payment.id)
    .maybeSingle();

  if (existing) return;

  await supabase.from("ledger_entries").insert({
    entry_type: "payment_in",
    amount: payment.amount,
    currency: payment.currency,
    description: `Mobile money payment ${payment.provider_reference ?? payment.id}`,
    payment_id: payment.id,
  });
}

function sumLedgerTotals(
  entries: Pick<LedgerEntry, "entry_type" | "amount" | "currency">[],
  displayCurrency: string,
  rate: number | null
) {
  let totalIn = 0;
  let totalOut = 0;
  for (const e of entries) {
    const amt = toDisplayAmount(Number(e.amount), e.currency, displayCurrency, rate);
    if (e.entry_type === "payment_in") totalIn += amt;
    else totalOut += amt;
  }
  return { totalIn, totalOut };
}

export async function getLedgerSummary(
  displayCurrency?: string | null
): Promise<LedgerSummary> {
  const currency = resolveDisplayCurrency(displayCurrency ?? getSiteCurrency());
  const supabase = createServiceClient();
  if (!supabase) {
    return { balance: 0, totalIn: 0, totalOut: 0, currency, entries: [] };
  }

  const rate = await getUsdToZmwRate();

  const [{ data: allForTotals }, { data: recent }] = await Promise.all([
    supabase.from("ledger_entries").select("entry_type, amount, currency"),
    supabase
      .from("ledger_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const list = (recent ?? []) as LedgerEntry[];
  const { totalIn, totalOut } = sumLedgerTotals(allForTotals ?? [], currency, rate);

  return {
    balance: totalIn - totalOut,
    totalIn,
    totalOut,
    currency,
    entries: list,
  };
}

export async function getMerchantAccountingSummary(
  displayCurrency?: string | null
): Promise<MerchantAccountingSummary> {
  const currency = resolveDisplayCurrency(displayCurrency ?? getSiteCurrency());
  const supabase = createServiceClient();
  const base = await getLedgerSummary(currency);

  if (!supabase) {
    return {
      ...base,
      customerWalletLiability: 0,
      platformFeesEarned: 0,
      walletOrderCount: 0,
      walletOrderVolume: 0,
      processedSalesVolume: 0,
      depositsReceivedTotal: 0,
      depositCount: 0,
    };
  }

  const rate = await getUsdToZmwRate();

  const [walletsRes, paymentsRes, depositsRes, depositLedgerRes] = await Promise.all([
    supabase.from("user_wallets").select("balance, currency"),
    supabase
      .from("payments")
      .select("amount, platform_fee, currency")
      .eq("provider", "wallet")
      .eq("status", "completed"),
    supabase
      .from("wallet_deposits")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("ledger_entries")
      .select("amount, currency")
      .eq("entry_type", "payment_in")
      .not("deposit_id", "is", null),
  ]);

  const customerWalletLiability = (walletsRes.data ?? []).reduce(
    (sum, w) => sum + toDisplayAmount(Number(w.balance), w.currency, currency, rate),
    0
  );

  const walletPayments = paymentsRes.data ?? [];
  const platformFeesEarned = walletPayments.reduce(
    (sum, p) =>
      sum + toDisplayAmount(Number(p.platform_fee ?? 0), p.currency, currency, rate),
    0
  );
  const walletOrderVolume = walletPayments.reduce(
    (sum, p) => sum + toDisplayAmount(Number(p.amount ?? 0), p.currency, currency, rate),
    0
  );

  const depositsReceivedTotal = (depositLedgerRes.data ?? []).reduce(
    (sum, e) => sum + toDisplayAmount(Number(e.amount), e.currency, currency, rate),
    0
  );

  return {
    ...base,
    customerWalletLiability,
    platformFeesEarned,
    walletOrderCount: walletPayments.length,
    walletOrderVolume,
    processedSalesVolume: walletOrderVolume,
    depositsReceivedTotal,
    depositCount: depositsRes.count ?? 0,
  };
}

export async function recordMerchantWithdrawal(input: {
  amount: number;
  description?: string;
  note?: string;
  currency?: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const amount = Number(input.amount);
  if (!amount || amount <= 0) {
    return { ok: false, error: "Enter a valid amount" };
  }

  const currency = resolveDisplayCurrency(input.currency ?? getSiteCurrency());
  const description =
    input.description?.trim() ||
    `Merchant withdrawal${input.note ? `: ${input.note}` : ""}`;

  const { error } = await supabase.from("ledger_entries").insert({
    entry_type: "payout",
    amount,
    currency,
    description,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function recordMerchantReconciliation(input: {
  actualMerchantBalance: number;
  note?: string;
  currency?: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const actual = Number(input.actualMerchantBalance);
  if (!Number.isFinite(actual) || actual < 0) {
    return { ok: false, error: "Enter the balance shown on your merchant phone" };
  }

  const displayCurrency = resolveDisplayCurrency(input.currency ?? getSiteCurrency());
  const summary = await getLedgerSummary(displayCurrency);
  const diff = actual - summary.balance;

  if (Math.abs(diff) < 0.01) {
    return { ok: true, matched: true, diff: 0, balance: summary.balance };
  }

  const currency = summary.currency;
  const note = input.note?.trim();
  const description = note
    ? `Reconciliation: ${note}`
    : `Reconciliation — merchant phone ${currency} ${actual}, web tracked ${currency} ${summary.balance}`;

  const { error } = await supabase.from("ledger_entries").insert(
    diff > 0
      ? {
          entry_type: "payment_in",
          amount: diff,
          currency,
          description: `${description} (credit)`,
        }
      : {
          entry_type: "payout",
          amount: Math.abs(diff),
          currency,
          description: `${description} (debit)`,
        }
  );

  if (error) return { ok: false, error: error.message };

  const updated = await getLedgerSummary(displayCurrency);
  return { ok: true, matched: false, diff, balance: updated.balance };
}
