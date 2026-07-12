import { isZambiaWalletCurrency } from "@/lib/deposit-methods";

export const WALLET_PAYMENT_METHODS_LABEL =
  "MTN, Airtel, Binance Pay, or USDT (TRC20)";

export const WALLET_PAYMENT_METHODS_SHORT = "MTN, Airtel, Binance, or USDT";

export const INTERNATIONAL_PAYMENT_METHODS_LABEL = "Binance Pay or USDT (TRC20)";

export const INTERNATIONAL_PAYMENT_METHODS_SHORT = "Binance or USDT";

export const WALLET_DEPOSIT_BANNER_COPY =
  "Deposit via MTN, Airtel, Binance Pay, or USDT (TRC20) — then activate tools instantly from your wallet.";

export const INTERNATIONAL_DEPOSIT_BANNER_COPY =
  "Deposit via Binance Pay or USDT (TRC20) — then activate tools instantly from your wallet.";

export function walletPaymentMethodsLabel(currency?: string | null): string {
  return isZambiaWalletCurrency(currency)
    ? WALLET_PAYMENT_METHODS_LABEL
    : INTERNATIONAL_PAYMENT_METHODS_LABEL;
}

export function walletPaymentMethodsShort(currency?: string | null): string {
  return isZambiaWalletCurrency(currency)
    ? WALLET_PAYMENT_METHODS_SHORT
    : INTERNATIONAL_PAYMENT_METHODS_SHORT;
}

export function walletDepositBannerCopy(currency?: string | null): string {
  return isZambiaWalletCurrency(currency)
    ? WALLET_DEPOSIT_BANNER_COPY
    : INTERNATIONAL_DEPOSIT_BANNER_COPY;
}
