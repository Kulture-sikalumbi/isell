import { createServiceClient } from "@/lib/supabase/server";
import { notifyAdminNewDeposit } from "@/lib/wallet-notifications";
import type {
  DepositMethod,
  DepositStatus,
  Tool,
  WalletDeposit,
  WalletTransaction,
  UserWallet,
} from "@/types/database";

export function getPlatformFee(): number {
  const fee = Number(process.env.PLATFORM_FEE_USD ?? 1);
  return Number.isFinite(fee) && fee >= 0 ? fee : 1;
}

export function getMerchantDetails() {
  return {
    mtn: process.env.MERCHANT_MTN_NUMBER?.trim() || "",
    airtel: process.env.MERCHANT_AIRTEL_NUMBER?.trim() || "",
    binance: process.env.MERCHANT_BINANCE_ID?.trim() || "",
    currency: process.env.WALLET_CURRENCY?.trim() || "USD",
  };
}

export async function getOrCreateWallet(userId: string): Promise<UserWallet | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("user_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("user_wallets")
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) {
    await supabase.rpc("ensure_user_wallet", { p_user_id: userId });
    const { data: retry } = await supabase
      .from("user_wallets")
      .select("*")
      .eq("user_id", userId)
      .single();
    return retry;
  }

  return created;
}

export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await getOrCreateWallet(userId);
  return wallet ? Number(wallet.balance) : 0;
}

export async function getWalletTransactions(
  userId: string,
  limit = 20
): Promise<WalletTransaction[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getUserDeposits(userId: string): Promise<WalletDeposit[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return data ?? [];
}

export async function createDepositRequest(input: {
  userId: string;
  amount: number;
  method: DepositMethod;
  transactionId: string;
  userEmail?: string;
  userName?: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const amount = Number(input.amount);
  if (!amount || amount <= 0) return null;

  const trimmedTxn = input.transactionId.trim();
  if (!trimmedTxn) return null;

  const reference = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const merchants = getMerchantDetails();

  const { data, error } = await supabase
    .from("wallet_deposits")
    .insert({
      user_id: input.userId,
      amount,
      currency: merchants.currency,
      method: input.method,
      transaction_id: trimmedTxn,
      reference,
      status: "pending",
    })
    .select()
    .single();

  if (error || !data) return null;

  await notifyAdminNewDeposit({
    depositId: data.id,
    userEmail: input.userEmail ?? "unknown",
    userName: input.userName,
    amount,
    currency: merchants.currency,
    method: input.method,
    reference,
    transactionId: trimmedTxn,
  });

  return data;
}

export async function confirmDeposit(depositId: string, adminNote?: string) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { data, error } = await supabase.rpc("confirm_wallet_deposit", {
    p_deposit_id: depositId,
    p_admin_note: adminNote ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string; balance?: number };
  return result;
}

export async function rejectDeposit(depositId: string, adminNote?: string) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { data: deposit } = await supabase
    .from("wallet_deposits")
    .select("status")
    .eq("id", depositId)
    .single();

  if (!deposit) return { ok: false, error: "Deposit not found" };
  if (deposit.status !== "pending") {
    return { ok: false, error: "Deposit already processed" };
  }

  const { error } = await supabase
    .from("wallet_deposits")
    .update({
      status: "rejected" as DepositStatus,
      admin_note: adminNote ?? null,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", depositId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function purchaseWithWallet(input: {
  userId: string;
  tool: Tool;
  hardwareId: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const platformFee = getPlatformFee();
  const price = Number(input.tool.retail_price);

  const { data, error } = await supabase.rpc("wallet_purchase", {
    p_user_id: input.userId,
    p_tool_id: input.tool.id,
    p_hardware_id: input.hardwareId.trim(),
    p_tool_price: price,
    p_platform_fee: platformFee,
    p_currency: "USD",
  });

  if (error) return { ok: false, error: error.message };

  const result = data as {
    ok: boolean;
    error?: string;
    payment_id?: string;
    reference?: string;
    balance?: number;
    fulfillment_mode?: string;
    required?: number;
  };

  return result;
}

export async function getPendingDeposits(): Promise<
  (WalletDeposit & { profile?: { email: string; full_name: string | null } })[]
> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("wallet_deposits")
    .select("*, profile:profiles!wallet_deposits_user_id_fkey(email, full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (data ?? []) as (WalletDeposit & {
    profile?: { email: string; full_name: string | null };
  })[];
}

export async function getPlatformFeeStats(): Promise<{
  totalFees: number;
  transactionCount: number;
}> {
  const supabase = createServiceClient();
  if (!supabase) return { totalFees: 0, transactionCount: 0 };

  const { data: payments } = await supabase
    .from("payments")
    .select("platform_fee")
    .eq("status", "completed")
    .gt("platform_fee", 0);

  const list = payments ?? [];
  const totalFees = list.reduce((sum, p) => sum + Number(p.platform_fee ?? 0), 0);

  return { totalFees, transactionCount: list.length };
}
