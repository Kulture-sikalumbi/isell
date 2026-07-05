/**
 * Zambia: ZMW shown as K (e.g. K50.00). Set WALLET_CURRENCY=USD for international.
 */
export function getSiteCurrency(): string {
  const pub = process.env.NEXT_PUBLIC_SITE_CURRENCY?.trim();
  const server = process.env.WALLET_CURRENCY?.trim();
  return pub || server || "ZMW";
}

export function isZambianCurrency(currency?: string): boolean {
  return (currency ?? getSiteCurrency()).toUpperCase() === "ZMW";
}

export function getPlatformFeeAmount(): number {
  const currency = getSiteCurrency();
  if (currency === "USD") {
    const usd = Number(process.env.PLATFORM_FEE_USD ?? process.env.PLATFORM_FEE ?? 1);
    return Number.isFinite(usd) && usd >= 0 ? usd : 1;
  }
  const zmw = Number(process.env.PLATFORM_FEE ?? process.env.PLATFORM_FEE_ZMW ?? 25);
  return Number.isFinite(zmw) && zmw >= 0 ? zmw : 25;
}

export function getCurrencyLabel(currency?: string): string {
  return isZambianCurrency(currency) ? "K" : "USD";
}

/** Format money for display — ZMW uses K prefix (Zambian convention). */
export function formatSiteCurrency(amount: number, currency?: string): string {
  const c = (currency ?? getSiteCurrency()).toUpperCase();
  const n = Number(amount);

  if (!Number.isFinite(n)) {
    return c === "ZMW" ? "K0.00" : "$0.00";
  }

  if (c === "ZMW") {
    const formatted = new Intl.NumberFormat("en-ZM", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
    return `K${formatted}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: c === "USD" ? "USD" : c,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function currencyLocale(currency?: string): string {
  return isZambianCurrency(currency) ? "en-ZM" : "en-US";
}
