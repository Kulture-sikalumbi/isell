import { convertCurrency, formatSiteCurrency, resolveDisplayCurrency } from "@/lib/format-currency";
import type { DepositMethod, UserPaymentMethodType } from "@/types/database";

export const DEPOSIT_METHOD_LABELS: Record<DepositMethod, string> = {
  mtn: "MTN Mobile Money",
  airtel: "Airtel Money",
  binance: "Binance Pay",
  usdt_trc20: "USDT (TRC20)",
  other: "Other",
};

/** All customer-facing deposit / payout methods — always shown regardless of display currency. */
export const ALL_DEPOSIT_METHODS: DepositMethod[] = [
  "mtn",
  "airtel",
  "binance",
  "usdt_trc20",
];

export function depositMethodLabel(method: DepositMethod): string {
  return DEPOSIT_METHOD_LABELS[method] ?? method;
}

export function isManualCryptoDeposit(method: DepositMethod): boolean {
  return method === "binance" || method === "usdt_trc20";
}

export function isMobileMoneyMethod(
  method: DepositMethod | UserPaymentMethodType
): boolean {
  return method === "mtn" || method === "airtel";
}

export function isZambiaWalletCurrency(currency?: string | null): boolean {
  return currency?.trim().toUpperCase() === "ZMW";
}

/**
 * Settlement currency for a payment rail (independent of UI display preference).
 * MoMo settles in ZMW; crypto rails settle in USD.
 */
export function settlementCurrencyForMethod(method: DepositMethod): "ZMW" | "USD" {
  return isMobileMoneyMethod(method) ? "ZMW" : "USD";
}

/**
 * Amount the customer must send on the rail, with dual label when display ≠ rail.
 * MoMo + USD wallet: "$10.00 (K180.00)". Crypto stays USD on the rail.
 */
export function formatDepositSendAmount(
  amount: number,
  displayCurrency: string,
  method: DepositMethod,
  usdToZmwRate?: number | null
): string {
  const display = resolveDisplayCurrency(displayCurrency);
  const settle = settlementCurrencyForMethod(method);
  const displayLabel = formatSiteCurrency(amount, display);

  if (display === settle) return displayLabel;

  if (!usdToZmwRate || usdToZmwRate <= 0) {
    return isMobileMoneyMethod(method)
      ? `${displayLabel} (pay in ZMW)`
      : `${displayLabel} (pay in USD)`;
  }

  const railAmount = convertCurrency(amount, display, settle, usdToZmwRate);
  const railLabel = formatSiteCurrency(railAmount, settle);
  return `${displayLabel} (${railLabel})`;
}

/** True when MoMo pay UI should stress that phones accept ZMW only. */
export function momoRequiresZmwNotice(displayCurrency?: string | null): boolean {
  return resolveDisplayCurrency(displayCurrency) !== "ZMW";
}

/** @deprecated Display currency no longer filters methods — always returns all rails. */
export function depositMethodsForCurrency(_currency?: string | null): DepositMethod[] {
  return ALL_DEPOSIT_METHODS;
}

export function userPaymentMethodTypesForCurrency(
  _currency?: string | null
): UserPaymentMethodType[] {
  return ALL_DEPOSIT_METHODS as UserPaymentMethodType[];
}

export function isDepositMethodAllowedForCurrency(
  method: DepositMethod,
  _currency?: string | null
): boolean {
  return ALL_DEPOSIT_METHODS.includes(method) || method === "other";
}

export function mobileMoneyUnavailableMessage(): string {
  return "That payment method is not available.";
}
