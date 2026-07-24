export const WALLET_PAYMENT_METHODS_LABEL =
  "MTN, Airtel, Binance Pay, or USDT (TRC20)";

export const WALLET_PAYMENT_METHODS_SHORT = "MTN, Airtel, Binance, or USDT";

export const WALLET_DEPOSIT_BANNER_COPY =
  "Deposit via MTN, Airtel, Binance Pay, or USDT (TRC20) — then activate tools instantly from your wallet.";

/** All rails are always available — display currency only changes how amounts are shown. */
export function walletPaymentMethodsLabel(_currency?: string | null): string {
  return WALLET_PAYMENT_METHODS_LABEL;
}

export function walletPaymentMethodsShort(_currency?: string | null): string {
  return WALLET_PAYMENT_METHODS_SHORT;
}

export function walletDepositBannerCopy(_currency?: string | null): string {
  return WALLET_DEPOSIT_BANNER_COPY;
}
