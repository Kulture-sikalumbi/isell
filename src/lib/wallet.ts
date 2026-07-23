import { getSiteCurrency } from "@/lib/currency";
import { getUsdToZmwRate } from "@/lib/currency-rates";
import { getFxSnapshot, planWalletSettlement } from "@/lib/deposit-settlement";
import { settlementCurrencyForMethod } from "@/lib/deposit-methods";
import { convertCurrency, resolveDisplayCurrency } from "@/lib/format-currency";
import { calculatePlatformFee } from "@/lib/platform-fee";
import { convertToolAmount, getToolPriceCurrency } from "@/lib/tool-pricing";
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

import { runtimeEnv } from "@/lib/runtime-env";
import { getMerchantDepositSettings } from "@/lib/site-settings";

export interface WalletDisplaySnapshot {
  /** Balance converted into the customer's display currency */
  displayBalance: number;
  displayCurrency: string;
  /** Raw ledger balance in the wallet's native currency */
  nativeBalance: number;
  nativeCurrency: string;
  fxRate: number | null;
  wallet: UserWallet | null;
}

export interface MerchantDetails {
  mtn: string;
  airtel: string;
  binancePayId: string;
  usdtTrc20Address: string;
  currency: string;
}

export async function getMerchantDetails(currency?: string): Promise<MerchantDetails> {
  const resolvedCurrency = currency?.trim().toUpperCase() || getSiteCurrency();
  const stored = await getMerchantDepositSettings();

  return {
    mtn: stored.mtn || runtimeEnv("MERCHANT_MTN_NUMBER") || "",
    airtel: stored.airtel || runtimeEnv("MERCHANT_AIRTEL_NUMBER") || "",
    binancePayId:
      stored.binancePayId ||
      runtimeEnv("MERCHANT_BINANCE_PAY_ID") ||
      runtimeEnv("MERCHANT_BINANCE_ID") ||
      "",
    usdtTrc20Address:
      stored.usdtTrc20Address || runtimeEnv("MERCHANT_USDT_TRC20_ADDRESS") || "",
    currency: resolvedCurrency,
  };
}

export function merchantDestinationFor(
  method: DepositMethod,
  merchants: MerchantDetails
): string {
  if (method === "airtel") return merchants.airtel;
  if (method === "binance") return merchants.binancePayId;
  if (method === "usdt_trc20") return merchants.usdtTrc20Address;
  return merchants.mtn;
}

export async function getOrCreateWallet(
  userId: string,
  currency?: string
): Promise<UserWallet | null> {
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
    .insert({ user_id: userId, currency: currency?.trim().toUpperCase() || getSiteCurrency() })
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

/** Convert a native wallet balance into the customer's display currency. */
export function convertWalletBalanceForDisplay(
  nativeBalance: number,
  nativeCurrency: string | null | undefined,
  displayCurrency: string,
  usdToZmwRate?: number | null
): number {
  return convertCurrency(
    nativeBalance,
    resolveDisplayCurrency(nativeCurrency),
    resolveDisplayCurrency(displayCurrency),
    usdToZmwRate
  );
}

/** Wallet snapshot with balance converted for the current display currency. */
export async function getWalletDisplaySnapshot(
  userId: string,
  displayCurrency?: string
): Promise<WalletDisplaySnapshot> {
  const resolvedDisplay = resolveDisplayCurrency(displayCurrency);
  const wallet = await getOrCreateWallet(userId, resolvedDisplay);
  const nativeBalance = wallet ? Number(wallet.balance) : 0;
  const nativeCurrency = resolveDisplayCurrency(wallet?.currency || resolvedDisplay);
  const fxRate =
    nativeCurrency !== resolvedDisplay ? await getUsdToZmwRate() : null;
  const displayBalance = convertWalletBalanceForDisplay(
    nativeBalance,
    nativeCurrency,
    resolvedDisplay,
    fxRate
  );

  return {
    displayBalance,
    displayCurrency: resolvedDisplay,
    nativeBalance,
    nativeCurrency,
    fxRate,
    wallet,
  };
}

export async function getWalletBalance(userId: string, currency?: string): Promise<number> {
  const snapshot = await getWalletDisplaySnapshot(userId, currency);
  return snapshot.displayBalance;
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
  amount?: number;
  method: DepositMethod;
  transactionId: string;
  senderPhone?: string;
  senderName?: string;
  userEmail?: string;
  userName?: string;
  currency?: string;
}): Promise<{ deposit: WalletDeposit } | { error: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { error: "Database not configured" };

  const trimmedTxn = input.transactionId.trim();
  if (!trimmedTxn) return { error: "TID is required" };

  const isMoMo = input.method === "mtn" || input.method === "airtel";
  let amount = Number(input.amount);
  let senderPhone = input.senderPhone?.trim() || null;
  let senderName = input.senderName?.trim() || null;
  let fullTransactionId = trimmedTxn;
  let amountFromSms = false;

  if (isMoMo) {
    const { resolveSmsReceiptForProof, normalizeCustomerProofInput } = await import(
      "@/lib/momo-sms-gateway"
    );
    fullTransactionId = normalizeCustomerProofInput(input.method, trimmedTxn);

    const resolved = await resolveSmsReceiptForProof({
      method: input.method,
      transactionId: fullTransactionId,
      amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
    });

    if (resolved.ok) {
      amount = Number(resolved.receipt.amount);
      amountFromSms = true;
      fullTransactionId = resolved.receipt.transaction_id;
      senderPhone = resolved.receipt.sender_phone || senderPhone;
      senderName = resolved.receipt.sender_name || senderName;
    } else if (resolved.code === "ambiguous") {
      return { error: resolved.error };
    } else {
      // SMS not in database yet — keep pending for later match / manual review.
      // No admin email or inbox alert for MoMo (see notifyAdminNewDeposit).
      if (!Number.isFinite(amount) || amount <= 0) {
        return {
          error:
            "No matching payment in our system yet. Enter how much you sent, or wait a moment after your MoMo SMS arrives and try again.",
        };
      }
      // Keep customer proof + amount; SMS may arrive later and auto-confirm.
    }
  } else if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount" };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount" };
  }

  const displayCurrency = resolveDisplayCurrency(input.currency);
  // MoMo settles in ZMW; crypto settles in USD — independent of UI display preference.
  const settleCurrency = settlementCurrencyForMethod(input.method);
  const rate = displayCurrency !== settleCurrency ? await getUsdToZmwRate() : null;

  // SMS amounts are already ZMW. Customer-typed amounts are in display currency.
  if (!amountFromSms) {
    amount = convertCurrency(amount, displayCurrency, settleCurrency, rate);
  }

  const reference = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await getMerchantDetails(settleCurrency);

  const { data, error } = await supabase
    .from("wallet_deposits")
    .insert({
      user_id: input.userId,
      amount,
      currency: settleCurrency,
      method: input.method,
      transaction_id: fullTransactionId,
      sender_phone: senderPhone,
      sender_name: senderName,
      reference,
      status: "pending",
    })
    .select()
    .single();

  if (error || !data) return { error: error?.message || "Failed to submit deposit" };

  await notifyAdminNewDeposit({
    depositId: data.id,
    userEmail: input.userEmail ?? "unknown",
    userName: input.userName,
    amount,
    currency: settleCurrency,
    method: input.method,
    reference,
    transactionId: fullTransactionId,
    senderPhone,
    senderName,
  });

  if (isMoMo) {
    try {
      const { tryAutoConfirmFromSmsReceipt } = await import("@/lib/momo-sms-gateway");
      const matched = await tryAutoConfirmFromSmsReceipt({
        depositId: data.id,
        transactionId: fullTransactionId,
        amount,
        method: input.method,
      });
      if (matched.matched) {
        const { data: refreshed } = await supabase
          .from("wallet_deposits")
          .select("*")
          .eq("id", data.id)
          .maybeSingle();
        return { deposit: (refreshed ?? data) as WalletDeposit };
      }
    } catch {
      // Non-fatal — deposit remains pending
    }
  }

  return { deposit: data as WalletDeposit };
}

export async function confirmDeposit(depositId: string, adminNote?: string) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { data: deposit } = await supabase
    .from("wallet_deposits")
    .select("status, transaction_id")
    .eq("id", depositId)
    .single();

  if (!deposit) return { ok: false, error: "Deposit not found" };
  if (deposit.status !== "pending") {
    return { ok: false, error: "Deposit already processed" };
  }
  if (!deposit.transaction_id?.trim()) {
    return { ok: false, error: "Customer has not submitted TID yet" };
  }

  return settleAndConfirmDeposit(depositId, adminNote ?? null);
}

async function settleAndConfirmDeposit(
  depositId: string,
  adminNote: string | null
): Promise<
  | {
      ok: true;
      balance?: number;
      settled_amount?: number;
      settled_currency?: string;
      alreadyConfirmed?: boolean;
    }
  | { ok: false; error: string }
> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { data: deposit } = await supabase
    .from("wallet_deposits")
    .select("status, transaction_id, user_id, amount, currency, method")
    .eq("id", depositId)
    .single();

  if (!deposit) return { ok: false, error: "Deposit not found" };
  if (deposit.status === "confirmed") return { ok: true, alreadyConfirmed: true };
  if (deposit.status !== "pending") {
    return { ok: false, error: "Deposit already processed" };
  }

  const wallet = await getOrCreateWallet(deposit.user_id);
  if (!wallet) return { ok: false, error: "Could not load wallet" };

  const fx = await getFxSnapshot();
  const plan = planWalletSettlement({
    sourceAmount: Number(deposit.amount),
    sourceCurrency: deposit.currency,
    walletCurrency: wallet.currency,
    fx,
  });

  if ("error" in plan) return { ok: false, error: plan.error };

  const { data, error } = await supabase.rpc("confirm_wallet_deposit", {
    p_deposit_id: depositId,
    p_admin_note: adminNote,
    p_settled_amount: plan.settledAmount,
    p_settled_currency: plan.settledCurrency,
    p_fx_usd_to_zmw: plan.fxUsdToZmw,
    p_fx_source: plan.fxSource,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as {
    ok: boolean;
    error?: string;
    balance?: number;
    settled_amount?: number;
    settled_currency?: string;
  };

  if (!result.ok) {
    return { ok: false, error: result.error || "Failed to confirm deposit" };
  }

  const { notifyDepositConfirmed } = await import("@/lib/user-notifications");
  await notifyDepositConfirmed({
    userId: deposit.user_id,
    amount: Number(result.settled_amount ?? plan.settledAmount),
    currency: String(result.settled_currency ?? plan.settledCurrency),
    method: deposit.method,
  });

  return {
    ok: true,
    balance: result.balance,
    settled_amount: Number(result.settled_amount ?? plan.settledAmount),
    settled_currency: String(result.settled_currency ?? plan.settledCurrency),
  };
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
  currency?: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const wallet = await getOrCreateWallet(input.userId, input.currency);
  if (!wallet) return { ok: false, error: "Wallet not found" };

  // Always debit in the wallet's native currency so switching display currency
  // only changes presentation, not the ledger units.
  const chargeCurrency = resolveDisplayCurrency(wallet.currency);
  const priceCurrency = getToolPriceCurrency(input.tool);
  const fxRate =
    priceCurrency !== chargeCurrency ? await getUsdToZmwRate() : null;
  const price = convertToolAmount(
    Number(input.tool.retail_price),
    priceCurrency,
    chargeCurrency,
    fxRate
  );
  const platformFee = calculatePlatformFee(price, input.tool);

  const { data, error } = await supabase.rpc("wallet_purchase", {
    p_user_id: input.userId,
    p_tool_id: input.tool.id,
    p_hardware_id: input.hardwareId.trim(),
    p_tool_price: price,
    p_platform_fee: platformFee,
    p_currency: chargeCurrency,
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
    .select(
      "user_id, order_number, hardware_id, amount, platform_fee, currency, tool:tools(name, identifier_label)"
    )
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

  if (payment.user_id && adminNote?.trim()) {
    const tool = payment.tool as { name?: string; identifier_label?: string } | null;
    const toolName = tool?.name ?? "activation";
    const { notifyOrderRefunded } = await import("@/lib/user-notifications");
    await notifyOrderRefunded({
      userId: payment.user_id,
      orderNumber: result.order_number ?? payment.order_number,
      amount: Number(result.refund_amount ?? payment.amount) + Number(payment.platform_fee ?? 0),
      currency: payment.currency,
      toolName,
      hardwareId: payment.hardware_id,
      identifierLabel: tool?.identifier_label,
      note: adminNote.trim(),
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
  pendingWithdrawals: number;
  awaitingOrders: number;
  unreadNotifications: number;
  unreadMessages: number;
  totalAttention: number;
}> {
  const supabase = createServiceClient();
  if (!supabase) {
    return {
      pendingDeposits: 0,
      pendingWithdrawals: 0,
      awaitingOrders: 0,
      unreadNotifications: 0,
      unreadMessages: 0,
      totalAttention: 0,
    };
  }

  const [depositsRes, withdrawalsRes, ordersRes, notifRes, messagesRes] = await Promise.all([
    supabase
      .from("wallet_deposits")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("wallet_withdrawals")
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
  const pendingWithdrawals = withdrawalsRes.count ?? 0;
  const awaitingOrders = ordersRes.count ?? 0;
  const unreadNotifications = notifRes.count ?? 0;
  const unreadMessages = messagesRes.count ?? 0;

  return {
    pendingDeposits,
    pendingWithdrawals,
    awaitingOrders,
    unreadNotifications,
    unreadMessages,
    totalAttention:
      pendingDeposits +
      pendingWithdrawals +
      awaitingOrders +
      unreadNotifications +
      unreadMessages,
  };
}

export async function createDepositIntent(input: {
  userId: string;
  amount: number;
  method: DepositMethod;
  userEmail?: string;
  userName?: string;
  currency?: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const amount = Number(input.amount);
  if (!amount || amount <= 0) return null;

  const reference = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const displayCurrency = resolveDisplayCurrency(input.currency);
  const settleCurrency = settlementCurrencyForMethod(input.method);
  const rate = displayCurrency !== settleCurrency ? await getUsdToZmwRate() : null;
  const settledAmount = convertCurrency(amount, displayCurrency, settleCurrency, rate);

  const { data, error } = await supabase
    .from("wallet_deposits")
    .insert({
      user_id: input.userId,
      amount: settledAmount,
      currency: settleCurrency,
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
  return settleAndConfirmDeposit(
    depositId,
    providerNote ?? "Auto-confirmed from provider callback"
  );
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

  let finalDeposit = {
    ...deposit,
    transaction_id: trimmedTxn,
    sender_phone: senderPhone,
    sender_name: senderName,
  };

  // Instant credit when merchant SMS already stored this proof code.
  try {
    const { tryAutoConfirmFromSmsReceipt } = await import("@/lib/momo-sms-gateway");
    const matched = await tryAutoConfirmFromSmsReceipt({
      depositId,
      transactionId: trimmedTxn,
      amount: Number(deposit.amount),
      method: deposit.method,
    });
    if (matched.matched) {
      const { data: refreshed } = await supabase
        .from("wallet_deposits")
        .select("*")
        .eq("id", depositId)
        .maybeSingle();
      if (refreshed) finalDeposit = refreshed;
    }
  } catch {
    // Non-fatal
  }

  return {
    ok: true,
    deposit: finalDeposit,
  };
}
