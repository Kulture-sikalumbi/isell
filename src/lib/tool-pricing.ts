import {
  convertCurrency,
  formatSiteCurrency,
  resolveDisplayCurrency,
} from "@/lib/format-currency";
import { getCheckoutTotal, type PlatformFeeToolInput } from "@/lib/platform-fee";
import type { DisplayCurrency, Tool } from "@/types/database";

export type PriceCurrency = DisplayCurrency;

export function normalizePriceCurrency(value?: string | null): PriceCurrency {
  const code = value?.trim().toUpperCase();
  return code === "USD" ? "USD" : "ZMW";
}

export function getToolPriceCurrency(
  tool: Pick<Tool, "price_currency"> | { price_currency?: string | null }
): PriceCurrency {
  return normalizePriceCurrency(tool.price_currency);
}

export function convertToolAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  usdToZmwRate?: number | null
): number {
  return convertCurrency(amount, fromCurrency, toCurrency, usdToZmwRate);
}

export function getToolCheckoutTotalInCurrency(
  tool: PlatformFeeToolInput & { price_currency?: string | null },
  displayCurrency?: string | null,
  usdToZmwRate?: number | null
): number {
  const from = getToolPriceCurrency(tool);
  const to = resolveDisplayCurrency(displayCurrency);
  const baseTotal = getCheckoutTotal(tool);
  return convertToolAmount(baseTotal, from, to, usdToZmwRate);
}

export function formatToolPrice(
  amount: number,
  priceCurrency: string,
  displayCurrency?: string | null,
  usdToZmwRate?: number | null
): string {
  const display = resolveDisplayCurrency(displayCurrency);
  const converted = convertToolAmount(amount, priceCurrency, display, usdToZmwRate);
  return formatSiteCurrency(converted, display);
}

export function formatToolCheckoutPrice(
  tool: PlatformFeeToolInput & { price_currency?: string | null },
  displayCurrency?: string | null,
  usdToZmwRate?: number | null
): string {
  const total = getToolCheckoutTotalInCurrency(tool, displayCurrency, usdToZmwRate);
  return formatSiteCurrency(total, resolveDisplayCurrency(displayCurrency));
}
