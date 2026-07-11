import type { DepositMethod } from "@/types/database";

export const DEPOSIT_METHOD_LABELS: Record<DepositMethod, string> = {
  mtn: "MTN Mobile Money",
  airtel: "Airtel Money",
  binance: "Binance Pay",
  usdt_trc20: "USDT (TRC20)",
  other: "Other",
};

export function depositMethodLabel(method: DepositMethod): string {
  return DEPOSIT_METHOD_LABELS[method] ?? method;
}

export function isManualCryptoDeposit(method: DepositMethod): boolean {
  return method === "binance" || method === "usdt_trc20";
}
