import { cookies, headers } from "next/headers";
import { currencyForCountry } from "@/lib/format-currency";
import {
  DISPLAY_CURRENCY_COOKIE,
  getDisplayCurrencyPreference,
  normalizeDisplayCurrency,
} from "@/lib/display-currency-preference";

/** Resolved currency for the current request — user preference first, then geo cookie. */
export async function getRequestCurrency(): Promise<string> {
  const preferred = await getDisplayCurrencyPreference();
  if (preferred) return preferred;

  const cookieStore = await cookies();
  const fromDisplayCookie = normalizeDisplayCurrency(
    cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value
  );
  if (fromDisplayCookie) return fromDisplayCookie;

  const headerStore = await headers();
  const fromHeader = headerStore.get("x-site-currency")?.trim();
  if (fromHeader) return fromHeader.toUpperCase();

  const fromCookie = cookieStore.get("site_currency")?.value?.trim();
  if (fromCookie) return fromCookie.toUpperCase();

  const country =
    headerStore.get("x-site-country")?.trim() ||
    cookieStore.get("site_country")?.value?.trim();

  return currencyForCountry(country);
}
