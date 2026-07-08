import { getSiteCurrency } from "@/lib/currency";
import { calculatePlatformFee } from "@/lib/platform-fee";
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

export function getMerchantDetails() {
  const currency = getSiteCurrency();
  return {
    mtn: process.env.MERCHANT_MTN_NUMBER?.trim() || "",
    airtel: process.env.MERCHANT_AIRTEL_NUMBER?.trim() || "",
    binance: process.env.MERCHANT_BINANCE_ID?.trim() || "",
    currency,
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
    .insert({ user_id: userId, currency: getSiteCurrency() })
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
  const { transactions } = await getWalletTransactionsPage(userId, { limit });
  return transactions;
}

export async function getWalletTransactionsPage(
  userId: string,
  options: { limit?: number; before?: string | null } = {}
): Promise<{ transactions: WalletTransaction[]; nextCursor: string | null }> {
  const limit = options.limit ?? 15;
  const supabase = createServiceClient();
  if (!supabase) return { transactions: [], nextCursor: null };

  let query = supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (options.before) {
    query = query.lt("created_at", options.before);
  }

  const { data } = await query;
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const transactions = (hasMore ? rows.slice(0, limit) : rows) as WalletTransaction[];
  const nextCursor =
    hasMore && transactions.length > 0
      ? transactions[transactions.length - 1].created_at
      : null;

  return { transactions, nextCursor };
}

export async function getPendingWalletDeposits(userId: string): Promise<WalletDeposit[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []) as WalletDeposit[];
}

/** Rejected deposits — shown in history only, never as pending. */
export async function getRejectedWalletDeposits(
  userId: string,
  limit = 20
): Promise<WalletDeposit[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "rejected")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as WalletDeposit[];
}

/** @deprecated Use getPendingWalletDeposits — kept for compatibility */
export async function getOpenWalletDeposits(userId: string): Promise<WalletDeposit[]> {
  return getPendingWalletDeposits(userId);
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
  senderPhone?: string;
  senderName?: string;
  userEmail?: string;
  userName?: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const amount = Number(input.amount);
  if (!amount || amount <= 0) return null;

  const trimmedTxn = input.transactionId.trim();
  if (!trimmedTxn) return null;

  const senderPhone = input.senderPhone?.trim() || null;
  const senderName = input.senderName?.trim() || null;

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
      sender_phone: senderPhone,
      sender_name: senderName,
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
    senderPhone,
    senderName,
  });

  return data;
}

export async function confirmDeposit(depositId: string, adminNote?: string) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { data: deposit } = await supabase
    .from("wallet_deposits")
    .select("status, transaction_id, user_id, amount, currency")
    .eq("id", depositId)
    .single();

  if (!deposit) return { ok: false, error: "Deposit not found" };
  if (deposit.status !== "pending") {
    return { ok: false, error: "Deposit already processed" };
  }
  if (!deposit.transaction_id?.trim()) {
    return { ok: false, error: "Customer has not submitted TID yet" };
  }

  const { data, error } = await supabase.rpc("confirm_wallet_deposit", {
    p_deposit_id: depositId,
    p_admin_note: adminNote ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string; balance?: number };
  if (result.ok && deposit) {
    const { notifyDepositConfirmed } = await import("@/lib/user-notifications");
    await notifyDepositConfirmed({
      userId: deposit.user_id,
      amount: Number(deposit.amount),
      currency: deposit.currency,
    });
  }
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

  const platformFee = calculatePlatformFee(input.tool.retail_price, input.tool);
  const price = Number(input.tool.retail_price);

  const { data, error } = await supabase.rpc("wallet_purchase", {
    p_user_id: input.userId,
    p_tool_id: input.tool.id,
    p_hardware_id: input.hardwareId.trim(),
    p_tool_price: price,
    p_platform_fee: platformFee,
    p_currency: getSiteCurrency(),
  });

  if (error) return { ok: false, error: error.message };

  const result = data as {
    ok: boolean;
    error?: string;
    payment_id?: string;
    reference?: string;
    order_number?: string;
    balance?: number;
    fulfillment_mode?: string;
    required?: number;
  };

  return result;
}

export async function refundWalletPayment(paymentId: string, adminNote?: string) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { data: payment } = await supabase
    .from("payments")
    .select("user_id, order_number, amount, platform_fee, currency, tool:tools(name)")
    .eq("id", paymentId)
    .single();

  if (!payment) return { ok: false, error: "Order not found" };

  const { data, error } = await supabase.rpc("refund_wallet_payment", {
    p_payment_id: paymentId,
    p_admin_note: adminNote ?? null,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as {
    ok: boolean;
    error?: string;
    balance?: number;
    refund_amount?: number;
    order_number?: string;
  };

  if (!result.ok) return { ok: false, error: result.error || "Refund failed" };

  if (payment.user_id) {
    const toolName =
      (payment.tool as { name?: string } | null)?.name ?? "activation";
    const { notifyOrderRefunded } = await import("@/lib/user-notifications");
    await notifyOrderRefunded({
      userId: payment.user_id,
      orderNumber: result.order_number ?? payment.order_number,
      amount: Number(result.refund_amount ?? payment.amount) + Number(payment.platform_fee ?? 0),
      currency: payment.currency,
      toolName,
      note: adminNote,
    });
  }

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

export async function getAdminAttentionCounts(): Promise<{
  pendingDeposits: number;
  awaitingOrders: number;
  unreadNotifications: number;
  unreadMessages: number;
  totalAttention: number;
}> {
  const supabase = createServiceClient();
  if (!supabase) {
    return {
      pendingDeposits: 0,
      awaitingOrders: 0,
      unreadNotifications: 0,
      unreadMessages: 0,
      totalAttention: 0,
    };
  }

  const [depositsRes, ordersRes, notifRes, messagesRes] = await Promise.all([
    supabase
      .from("wallet_deposits")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .eq("fulfillment_status", "awaiting"),
    supabase
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
    supabase
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_role", "user")
      .is("read_by_admin_at", null),
  ]);

  const pendingDeposits = depositsRes.count ?? 0;
  const awaitingOrders = ordersRes.count ?? 0;
  const unreadNotifications = notifRes.count ?? 0;
  const unreadMessages = messagesRes.count ?? 0;

  return {
    pendingDeposits,
    awaitingOrders,
    unreadNotifications,
    unreadMessages,
    totalAttention: pendingDeposits + awaitingOrders + unreadNotifications + unreadMessages,
  };
}

export async function createDepositIntent(input: {
  userId: string;
  amount: number;
  method: DepositMethod;
  userEmail?: string;
  userName?: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const amount = Number(input.amount);
  if (!amount || amount <= 0) return null;

  const reference = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const merchants = getMerchantDetails();

  const { data, error } = await supabase
    .from("wallet_deposits")
    .insert({
      user_id: input.userId,
      amount,
      currency: merchants.currency,
      method: input.method,
      transaction_id: null,
      reference,
      status: "pending",
    })
    .select()
    .single();

  if (error || !data) return null;

  return data;
}

export async function getDepositByIdForUser(depositId: string, userId: string) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("id", depositId)
    .eq("user_id", userId)
    .maybeSingle();

  return data as WalletDeposit | null;
}

export async function setDepositProviderReference(input: {
  depositId: string;
  provider: string;
  providerReference?: string | null;
  providerStatus?: string;
  providerPayload?: Record<string, unknown>;
}) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { data, error } = await supabase
    .from("wallet_deposits")
    .update({
      provider: input.provider,
      provider_reference: input.providerReference ?? null,
      provider_status: input.providerStatus ?? "PENDING",
      provider_payload: input.providerPayload ?? null,
    })
    .eq("id", input.depositId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Deposit not found or already processed" };
  return { ok: true, deposit: data as WalletDeposit };
}

export async function updateDepositProviderStatus(input: {
  depositId: string;
  providerStatus: string;
  providerPayload?: Record<string, unknown>;
}) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const updates: Record<string, unknown> = {
    provider_status: input.providerStatus,
  };
  if (input.providerPayload) {
    updates.provider_payload = input.providerPayload;
  }

  const { data, error } = await supabase
    .from("wallet_deposits")
    .update(updates)
    .eq("id", input.depositId)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Deposit not found" };
  return { ok: true, deposit: data as WalletDeposit };
}

export async function confirmDepositFromProvider(depositId: string, providerNote?: string) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { data } = await supabase
    .from("wallet_deposits")
    .select("status")
    .eq("id", depositId)
    .maybeSingle();

  if (!data) return { ok: false, error: "Deposit not found" };
  if (data.status === "confirmed") return { ok: true, alreadyConfirmed: true };
  if (data.status !== "pending") return { ok: false, error: "Deposit cannot be confirmed" };

  const { data: result, error } = await supabase.rpc("confirm_wallet_deposit", {
    p_deposit_id: depositId,
    p_admin_note: providerNote ?? "Auto-confirmed from provider callback",
  });
  if (error) return { ok: false, error: error.message };

  const typed = result as { ok: boolean; error?: string; balance?: number };
  if (!typed.ok) return { ok: false, error: typed.error || "Failed to confirm deposit" };
  return { ok: true, balance: typed.balance };
}

export async function submitDepositTransactionId(
  depositId: string,
  userId: string,
  input: {
    transactionId: string;
    senderPhone?: string;
    senderName?: string;
    userEmail?: string;
    userName?: string;
  }
) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const trimmedTxn = input.transactionId.trim();
  if (!trimmedTxn) return { ok: false, error: "TID is required" };

  const senderPhone = input.senderPhone?.trim() || null;
  const senderName = input.senderName?.trim() || null;

  const { data: deposit } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("id", depositId)
    .eq("user_id", userId)
    .single();

  if (!deposit) return { ok: false, error: "Deposit not found" };
  if (deposit.status !== "pending") {
    return { ok: false, error: "This deposit was already processed" };
  }
  if (deposit.transaction_id) {
    return { ok: false, error: "TID already submitted" };
  }

  const { error } = await supabase
    .from("wallet_deposits")
    .update({
      transaction_id: trimmedTxn,
      sender_phone: senderPhone,
      sender_name: senderName,
    })
    .eq("id", depositId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  await notifyAdminNewDeposit({
    depositId: deposit.id,
    userEmail: input.userEmail ?? profile?.email ?? "unknown",
    userName: input.userName ?? profile?.full_name ?? undefined,
    amount: Number(deposit.amount),
    currency: deposit.currency,
    method: deposit.method,
    reference: deposit.reference,
    transactionId: trimmedTxn,
    senderPhone,
    senderName,
  });

  return {
    ok: true,
    deposit: { ...deposit, transaction_id: trimmedTxn, sender_phone: senderPhone, sender_name: senderName },
  };
}
