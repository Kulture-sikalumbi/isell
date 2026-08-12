import { createServiceClient } from "@/lib/supabase/server";
import { getOrCreateWallet } from "@/lib/wallet";
import { notifyUser } from "@/lib/user-notifications";
import { resolveDisplayCurrency } from "@/lib/format-currency";

export async function creditUserWalletByAdmin(input: {
  userId: string;
  amount: number;
  currency: string;
  adminNote?: string | null;
  adminEmail?: string | null;
}) {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false as const, error: "Database not configured" };

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: "Enter a valid amount" };
  }

  const currency = resolveDisplayCurrency(input.currency);
  const wallet = await getOrCreateWallet(input.userId, currency);
  if (!wallet) return { ok: false as const, error: "Wallet not found" };

  if (resolveDisplayCurrency(wallet.currency) !== currency) {
    return {
      ok: false as const,
      error: `This user wallet is in ${wallet.currency}. Credit using the same currency.`,
    };
  }

  const currentBalance = Number(wallet.balance);
  const nextBalance = currentBalance + amount;
  const adminNote = input.adminNote?.trim() || null;
  const creditedAt = new Date().toISOString();
  const description = adminNote
    ? `Admin wallet credit (${currency}) on ${creditedAt}: ${adminNote}`
    : `Admin wallet credit (${currency}) on ${creditedAt}`;

  const { error: walletError } = await supabase
    .from("user_wallets")
    .update({ balance: nextBalance, updated_at: creditedAt })
    .eq("user_id", input.userId)
    .eq("currency", currency);

  if (walletError) return { ok: false as const, error: walletError.message };

  const { error: txError } = await supabase.from("wallet_transactions").insert({
    user_id: input.userId,
    type: "adjustment",
    amount,
    balance_after: nextBalance,
    currency,
    source_amount: amount,
    source_currency: currency,
    description,
  });

  if (txError) return { ok: false as const, error: txError.message };

  await notifyUser({
    userId: input.userId,
    type: "wallet_credit_admin",
    title: "Wallet credited by admin",
    message: adminNote
      ? `${currency} ${amount.toFixed(2)} was added to your wallet. Note: ${adminNote}`
      : `${currency} ${amount.toFixed(2)} was added to your wallet by admin.`,
    link: "/dashboard?tab=wallet",
  });

  return { ok: true as const, balance: nextBalance, previousBalance: currentBalance, currency };
}
