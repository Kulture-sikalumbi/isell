import { formatSiteCurrency } from "@/lib/format-currency";

/** Minimum amount a customer may request for withdrawal, per wallet currency. */
export const WITHDRAWAL_MINIMUMS: Record<string, number> = {
  ZMW: 1000,
  USD: 100,
};

export function getWithdrawalMinimum(currency: string): number {
  const code = currency.trim().toUpperCase();
  return WITHDRAWAL_MINIMUMS[code] ?? WITHDRAWAL_MINIMUMS.USD;
}

export function formatWithdrawalMinimum(currency: string): string {
  return formatSiteCurrency(getWithdrawalMinimum(currency), currency);
}

export const WALLET_DEPOSIT_TERMS = [
  "Wallet funds are prepaid balance for tool activations on iSell Unlocks.",
  "Deposits are verified manually (or via MTN API) before your balance is credited.",
  "You can deposit without saving payment methods — enter TID and sender details manually as before.",
  "Saved payment methods are optional for deposits (they pre-fill sender info) and required for withdrawals.",
  "Minimum withdrawal amounts apply — see the withdraw section for current limits.",
] as const;

export const WITHDRAWAL_POLICY_POINTS = [
  "Withdrawals are processed manually by our team to your saved payout method (MTN, Airtel, Binance Pay, or USDT TRC20).",
  "You must add and select a payout method before requesting a withdrawal.",
  "Only one pending withdrawal is allowed at a time.",
  "Processing may take up to 24–48 hours on business days after admin approval.",
  "Withdrawal amounts must meet the minimum for your wallet currency.",
  "We may reject a request if details do not match your account or if fraud is suspected.",
  "Platform fees on purchases are non-refundable; only unused wallet balance can be withdrawn.",
] as const;

export function withdrawalPolicyWithMinimum(currency: string): readonly string[] {
  const minLabel = formatWithdrawalMinimum(currency);
  return [
    `Minimum withdrawal: ${minLabel}. Amounts below this cannot be withdrawn.`,
    ...WITHDRAWAL_POLICY_POINTS,
  ];
}

export function validateWithdrawalAmount(
  amount: number,
  balance: number,
  currency: string
): { ok: true } | { ok: false; error: string } {
  if (!amount || amount <= 0) {
    return { ok: false, error: "Enter a valid withdrawal amount" };
  }

  const minimum = getWithdrawalMinimum(currency);
  if (amount < minimum) {
    return {
      ok: false,
      error: `Minimum withdrawal is ${formatWithdrawalMinimum(currency)}`,
    };
  }

  if (amount > balance) {
    return { ok: false, error: "Amount exceeds your available balance" };
  }

  return { ok: true };
}
