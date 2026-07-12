import type { DepositMethod, UserPaymentMethodType } from "@/types/database";

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

export function isMobileMoneyMethod(
  method: DepositMethod | UserPaymentMethodType
): boolean {
  return method === "mtn" || method === "airtel";
}

export function isZambiaWalletCurrency(currency?: string | null): boolean {
  return currency?.trim().toUpperCase() === "ZMW";
}

const ZAMBIA_DEPOSIT_METHODS: DepositMethod[] = ["mtn", "airtel", "binance", "usdt_trc20"];
const INTERNATIONAL_DEPOSIT_METHODS: DepositMethod[] = ["binance", "usdt_trc20"];

export function depositMethodsForCurrency(currency?: string | null): DepositMethod[] {
  return isZambiaWalletCurrency(currency)
    ? ZAMBIA_DEPOSIT_METHODS
    : INTERNATIONAL_DEPOSIT_METHODS;
}

export function userPaymentMethodTypesForCurrency(
  currency?: string | null
): UserPaymentMethodType[] {
  return depositMethodsForCurrency(currency) as UserPaymentMethodType[];
}

export function isDepositMethodAllowedForCurrency(
  method: DepositMethod,
  currency?: string | null
): boolean {
  return depositMethodsForCurrency(currency).includes(method);
}

export function mobileMoneyUnavailableMessage(): string {
  return "MTN and Airtel are only available for Zambia (K) accounts. Switch currency in the menu for mobile money.";
}
