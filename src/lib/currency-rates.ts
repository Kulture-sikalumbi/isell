import { getCurrencyRateSettings, saveCurrencyRateSettings } from "@/lib/site-settings";

const FX_CACHE_TTL_MS = 60 * 60 * 1000;

let cachedUsdToZmwRate: { value: number; fetchedAt: number } | null = null;

export async function getUsdToZmwRate(): Promise<number | null> {
  const now = Date.now();
  if (cachedUsdToZmwRate && now - cachedUsdToZmwRate.fetchedAt < FX_CACHE_TTL_MS) {
    return cachedUsdToZmwRate.value;
  }

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });

    if (response.ok) {
      const data = (await response.json()) as {
        result?: string;
        rates?: Record<string, number>;
      };

      const rate = Number(data.rates?.ZMW);
      if (Number.isFinite(rate) && rate > 0) {
        cachedUsdToZmwRate = { value: rate, fetchedAt: now };
        await saveCurrencyRateSettings({ usdToZmwRate: rate, source: "live" });
        return rate;
      }
    }
  } catch {
    // Fall back to the last known good rate below.
  }

  if (cachedUsdToZmwRate) return cachedUsdToZmwRate.value;

  const settings = await getCurrencyRateSettings();
  if (settings.usdToZmwRate) {
    cachedUsdToZmwRate = { value: settings.usdToZmwRate, fetchedAt: now };
    return settings.usdToZmwRate;
  }

  return null;
}
