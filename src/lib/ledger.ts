import { getSiteCurrency } from "@/lib/currency";
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

function sumLedgerTotals(entries: Pick<LedgerEntry, "entry_type" | "amount">[]) {
  let totalIn = 0;
  let totalOut = 0;
  for (const e of entries) {
    const amt = Number(e.amount);
    if (e.entry_type === "payment_in") totalIn += amt;
    else totalOut += amt;
  }
  return { totalIn, totalOut };
}

export async function getLedgerSummary(): Promise<LedgerSummary> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { balance: 0, totalIn: 0, totalOut: 0, currency: getSiteCurrency(), entries: [] };
  }

  const [{ data: allForTotals }, { data: recent }] = await Promise.all([
    supabase.from("ledger_entries").select("entry_type, amount"),
    supabase
      .from("ledger_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const list = recent ?? [];
  const { totalIn, totalOut } = sumLedgerTotals(allForTotals ?? []);

  return {
    balance: totalIn - totalOut,
    totalIn,
    totalOut,
    currency: list[0]?.currency ?? getSiteCurrency(),
    entries: list,
  };
}

export async function getMerchantAccountingSummary(): Promise<MerchantAccountingSummary> {
  const supabase = createServiceClient();
  const base = await getLedgerSummary();

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

  const [walletsRes, paymentsRes, depositsRes, depositLedgerRes] = await Promise.all([
    supabase.from("user_wallets").select("balance"),
    supabase
      .from("payments")
      .select("amount, platform_fee")
      .eq("provider", "wallet")
      .eq("status", "completed"),
    supabase
      .from("wallet_deposits")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("ledger_entries")
      .select("amount")
      .eq("entry_type", "payment_in")
      .not("deposit_id", "is", null),
  ]);

  const customerWalletLiability = (walletsRes.data ?? []).reduce(
    (sum, w) => sum + Number(w.balance),
    0
  );

  const walletPayments = paymentsRes.data ?? [];
  const platformFeesEarned = walletPayments.reduce(
    (sum, p) => sum + Number(p.platform_fee ?? 0),
    0
  );
  const walletOrderVolume = walletPayments.reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0
  );

  const depositsReceivedTotal = (depositLedgerRes.data ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
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
}) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const amount = Number(input.amount);
  if (!amount || amount <= 0) {
    return { ok: false, error: "Enter a valid amount" };
  }

  const currency = getSiteCurrency();
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
}) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const actual = Number(input.actualMerchantBalance);
  if (!Number.isFinite(actual) || actual < 0) {
    return { ok: false, error: "Enter the balance shown on your merchant phone" };
  }

  const summary = await getLedgerSummary();
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

  const updated = await getLedgerSummary();
  return { ok: true, matched: false, diff, balance: updated.balance };
}
