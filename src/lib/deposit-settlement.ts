import { getCurrencyRateSettings } from "@/lib/site-settings";
import { getUsdToZmwRate } from "@/lib/currency-rates";
import { convertCurrency, resolveDisplayCurrency } from "@/lib/format-currency";

export type FxSource = "live" | "manual" | "none" | "unknown";

export interface FxSnapshot {
  usdToZmwRate: number | null;
  source: FxSource;
}

/** Current USD→ZMW snapshot used when funds land (locked onto the deposit record). */
export async function getFxSnapshot(): Promise<FxSnapshot> {
  const settings = await getCurrencyRateSettings();
  const liveOrCached = await getUsdToZmwRate();

  if (liveOrCached && Number.isFinite(liveOrCached) && liveOrCached > 0) {
    // getUsdToZmwRate persists live rates; re-read source after fetch
    const refreshed = await getCurrencyRateSettings();
    return {
      usdToZmwRate: liveOrCached,
      source: refreshed.source === "manual" || refreshed.source === "live" ? refreshed.source : "live",
    };
  }

  if (settings.usdToZmwRate) {
    return {
      usdToZmwRate: settings.usdToZmwRate,
      source: settings.source === "manual" || settings.source === "live" ? settings.source : "manual",
    };
  }

  return { usdToZmwRate: null, source: "unknown" };
}

export interface WalletSettlementPlan {
  /** Original paid amount (rail) */
  sourceAmount: number;
  sourceCurrency: string;
  /** Amount to credit wallet */
  settledAmount: number;
  settledCurrency: string;
  /** USD→ZMW locked for this settlement; null when currencies match */
  fxUsdToZmw: number | null;
  fxSource: FxSource;
}

/**
 * Convert a paid deposit into the wallet's native currency using the rate at landing time.
 * Past deposits keep their locked rate — we never revalue balances when FX moves.
 */
export function planWalletSettlement(input: {
  sourceAmount: number;
  sourceCurrency: string;
  walletCurrency: string;
  fx: FxSnapshot;
}): WalletSettlementPlan | { error: string } {
  const sourceAmount = Number(input.sourceAmount);
  const sourceCurrency = resolveDisplayCurrency(input.sourceCurrency);
  const settledCurrency = resolveDisplayCurrency(input.walletCurrency);

  if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) {
    return { error: "Invalid deposit amount" };
  }

  if (sourceCurrency === settledCurrency) {
    return {
      sourceAmount,
      sourceCurrency,
      settledAmount: Math.round(sourceAmount * 100) / 100,
      settledCurrency,
      fxUsdToZmw: null,
      fxSource: "none",
    };
  }

  if (!input.fx.usdToZmwRate || input.fx.usdToZmwRate <= 0) {
    return {
      error:
        "Exchange rate is not set. Add a USD→ZMW rate in Admin → Settings before confirming mixed-currency deposits.",
    };
  }

  const settledAmount = convertCurrency(
    sourceAmount,
    sourceCurrency,
    settledCurrency,
    input.fx.usdToZmwRate
  );

  if (!Number.isFinite(settledAmount) || settledAmount <= 0) {
    return { error: "Could not convert deposit to wallet currency" };
  }

  return {
    sourceAmount,
    sourceCurrency,
    settledAmount,
    settledCurrency,
    fxUsdToZmw: input.fx.usdToZmwRate,
    fxSource: input.fx.source === "unknown" ? "manual" : input.fx.source,
  };
}
