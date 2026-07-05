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

export function getCurrencyLabel(currency?: string): string {
  return isZambianCurrency(currency) ? "K" : "USD";
}

/** Customer-facing currency — on a Zambian site always show Kwacha (K). */
export function resolveDisplayCurrency(currency?: string | null): string {
  const site = getSiteCurrency();
  if (isZambianCurrency(site)) return "ZMW";
  return (currency?.trim() || site).toUpperCase();
}

/** Format money for display — ZMW uses K prefix (Zambian convention). */
export function formatSiteCurrency(amount: number, currency?: string): string {
  const c = resolveDisplayCurrency(currency);
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
