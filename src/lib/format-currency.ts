const DEFAULT_CURRENCY = "USD";

function normalizeCurrency(currency?: string | null): string {
  return (currency?.trim() || DEFAULT_CURRENCY).toUpperCase();
}

export function currencyForCountry(country?: string | null): string {
  const code = country?.trim().toUpperCase();
  return code === "ZM" ? "ZMW" : DEFAULT_CURRENCY;
}

/** Read display currency cookie (user preference — takes priority over geo). */
export function readDisplayCurrencyCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)display_currency=([^;]+)/);
  if (!match) return null;
  try {
    const code = decodeURIComponent(match[1]).trim().toUpperCase();
    return code === "ZMW" || code === "USD" ? code : null;
  } catch {
    const code = match[1].trim().toUpperCase();
    return code === "ZMW" || code === "USD" ? code : null;
  }
}

/** Read currency cookie set by middleware (client-only). */
export function readSiteCurrencyCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)site_currency=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).trim().toUpperCase();
  } catch {
    return match[1].trim().toUpperCase();
  }
}

/**
 * Customer display currency on the client — user preference cookie first.
 */
export function getClientDisplayCurrency(): string {
  return readDisplayCurrencyCookie() ?? readSiteCurrencyCookie() ?? getSiteCurrency();
}

/** Server / admin default from env — not a substitute for geo-based customer currency. */
export function getSiteCurrency(): string {
  const pub = process.env.NEXT_PUBLIC_SITE_CURRENCY?.trim();
  const server = process.env.WALLET_CURRENCY?.trim();
  return normalizeCurrency(pub || server || DEFAULT_CURRENCY);
}

export function isZambianCurrency(currency?: string): boolean {
  return normalizeCurrency(currency ?? getClientDisplayCurrency()) === "ZMW";
}

export function getCurrencyLabel(currency?: string): string {
  return normalizeCurrency(currency ?? getClientDisplayCurrency()) === "ZMW" ? "K" : "USD";
}

export function resolveDisplayCurrency(currency?: string | null): string {
  return normalizeCurrency(currency ?? getClientDisplayCurrency());
}

/**
 * Convert between USD and ZMW. For tool/catalog prices use convertToolAmount()
 * from @/lib/tool-pricing with each tool's stored price_currency — never assume USD.
 */
export function convertCurrency(
  amount: number,
  fromCurrency?: string | null,
  toCurrency?: string | null,
  usdToZmwRate?: number | null
): number {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  const value = Number(amount);
  const rate =
    Number.isFinite(usdToZmwRate as number) && (usdToZmwRate as number) > 0
      ? (usdToZmwRate as number)
      : null;

  if (!Number.isFinite(value)) return 0;
  if (from === to) return value;

  if (from === "USD" && to === "ZMW") {
    if (!rate) return value;
    return Math.round(value * rate * 100) / 100;
  }

  if (from === "ZMW" && to === "USD") {
    if (!rate) return value;
    return Math.round((value / rate) * 100) / 100;
  }

  return value;
}

/** Format money for display — ZMW uses K prefix (Zambian convention). */
export function formatSiteCurrency(amount: number, currency?: string): string {
  const c = resolveDisplayCurrency(currency);
  const baseCurrency = currency ? c : DEFAULT_CURRENCY;
  const n = convertCurrency(amount, baseCurrency, c);

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
  return normalizeCurrency(currency ?? getClientDisplayCurrency()) === "ZMW" ? "en-ZM" : "en-US";
}
