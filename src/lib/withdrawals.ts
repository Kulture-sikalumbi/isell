import { createServiceClient } from "@/lib/supabase/server";
import { paymentMethodSnapshot } from "@/lib/payment-methods";
import { getOrCreateWallet } from "@/lib/wallet";
import { validateWithdrawalAmount } from "@/lib/wallet-policy";
import { notifyAdminNewWithdrawal } from "@/lib/withdraw-notifications";
import type { UserPaymentMethod, WalletWithdrawal } from "@/types/database";

export async function getPendingWithdrawalForUser(
  userId: string
): Promise<WalletWithdrawal | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("wallet_withdrawals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as WalletWithdrawal) ?? null;
}

export async function getUserWithdrawals(userId: string, limit = 10): Promise<WalletWithdrawal[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("wallet_withdrawals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as WalletWithdrawal[];
}

export async function createWithdrawalRequest(input: {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: UserPaymentMethod;
  policyAccepted: boolean;
  userEmail?: string;
  userName?: string;
}): Promise<{ ok: true; withdrawal: WalletWithdrawal } | { ok: false; error: string }> {
  if (!input.policyAccepted) {
    return { ok: false, error: "You must accept the withdrawal policy" };
  }

  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const pending = await getPendingWithdrawalForUser(input.userId);
  if (pending) {
    return {
      ok: false,
      error: "You already have a pending withdrawal. Wait for admin to process it first.",
    };
  }

  const wallet = await getOrCreateWallet(input.userId, input.currency);
  if (!wallet) return { ok: false, error: "Wallet not found" };

  const balance = Number(wallet.balance);
  const amount = Number(input.amount);
  const validation = validateWithdrawalAmount(amount, balance, input.currency);
  if (!validation.ok) return validation;

  const reference = `WDR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const snapshot = paymentMethodSnapshot(input.paymentMethod);

  const { data, error } = await supabase
    .from("wallet_withdrawals")
    .insert({
      user_id: input.userId,
      amount,
      currency: input.currency.trim().toUpperCase(),
      payment_method_id: input.paymentMethod.id,
      payment_method_snapshot: snapshot,
      reference,
      status: "pending",
      policy_accepted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to create withdrawal request" };
  }

  await notifyAdminNewWithdrawal({
    withdrawalId: data.id,
    userEmail: input.userEmail ?? "unknown",
    userName: input.userName,
    amount,
    currency: input.currency,
    reference,
    paymentMethod: input.paymentMethod,
  });

  return { ok: true, withdrawal: data as WalletWithdrawal };
}

export async function getPendingWithdrawals(): Promise<
  (WalletWithdrawal & { profile?: { email: string; full_name: string | null } })[]
> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("wallet_withdrawals")
    .select("*, profile:profiles!wallet_withdrawals_user_id_fkey(email, full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (data ?? []) as (WalletWithdrawal & {
    profile?: { email: string; full_name: string | null };
  })[];
}

export async function completeWithdrawal(
  withdrawalId: string,
  adminNote?: string
): Promise<{ ok: boolean; error?: string; balance?: number }> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { data: withdrawal } = await supabase
    .from("wallet_withdrawals")
    .select("status, user_id, amount, currency")
    .eq("id", withdrawalId)
    .single();

  if (!withdrawal) return { ok: false, error: "Withdrawal not found" };
  if (withdrawal.status !== "pending") {
    return { ok: false, error: "Withdrawal already processed" };
  }

  const { data, error } = await supabase.rpc("process_wallet_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_admin_note: adminNote ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string; balance?: number };
  if (result.ok) {
    const { notifyWithdrawalCompleted } = await import("@/lib/user-notifications");
    await notifyWithdrawalCompleted({
      userId: withdrawal.user_id,
      amount: Number(withdrawal.amount),
      currency: withdrawal.currency,
    });
  }

  return result;
}

export async function rejectWithdrawal(
  withdrawalId: string,
  adminNote?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { data: withdrawal } = await supabase
    .from("wallet_withdrawals")
    .select("status, user_id, amount, currency")
    .eq("id", withdrawalId)
    .single();

  if (!withdrawal) return { ok: false, error: "Withdrawal not found" };
  if (withdrawal.status !== "pending") {
    return { ok: false, error: "Withdrawal already processed" };
  }

  const { error } = await supabase
    .from("wallet_withdrawals")
    .update({
      status: "rejected",
      admin_note: adminNote ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("id", withdrawalId);

  if (error) return { ok: false, error: error.message };

  const { notifyWithdrawalRejected } = await import("@/lib/user-notifications");
  await notifyWithdrawalRejected({
    userId: withdrawal.user_id,
    amount: Number(withdrawal.amount),
    currency: withdrawal.currency,
    note: adminNote,
  });

  return { ok: true };
}
