import { createServiceClient } from "@/lib/supabase/server";
import type { LedgerEntry, Payment } from "@/types/database";

export interface LedgerSummary {
  balance: number;
  totalIn: number;
  totalOut: number;
  currency: string;
  entries: LedgerEntry[];
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

export async function getLedgerSummary(): Promise<LedgerSummary> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { balance: 0, totalIn: 0, totalOut: 0, currency: "USD", entries: [] };
  }

  const { data: entries } = await supabase
    .from("ledger_entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const list = entries ?? [];
  let totalIn = 0;
  let totalOut = 0;

  for (const e of list) {
    const amt = Number(e.amount);
    if (e.entry_type === "payment_in") totalIn += amt;
    else totalOut += amt;
  }

  return {
    balance: totalIn - totalOut,
    totalIn,
    totalOut,
    currency: list[0]?.currency ?? "USD",
    entries: list,
  };
}
