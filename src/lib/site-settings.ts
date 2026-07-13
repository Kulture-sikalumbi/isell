import { createServiceClient } from "@/lib/supabase/server";

const CURRENCY_SETTINGS_KEY = "currency";

export interface CurrencyRateSettings {
  usdToZmwRate: number | null;
  source: "live" | "manual" | "unknown";
  updatedAt: string | null;
}

function parseRate(value: unknown): number | null {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export async function getCurrencyRateSettings(): Promise<CurrencyRateSettings> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { usdToZmwRate: null, source: "unknown", updatedAt: null };
  }

  const { data } = await supabase
    .from("site_settings")
    .select("setting_value, updated_at")
    .eq("setting_key", CURRENCY_SETTINGS_KEY)
    .maybeSingle();

  const settingValue = (data?.setting_value as Record<string, unknown> | null) ?? null;

  return {
    usdToZmwRate: parseRate(settingValue?.usd_to_zmw_rate),
    source: (settingValue?.source as CurrencyRateSettings["source"]) ?? "unknown",
    updatedAt: data?.updated_at ?? (settingValue?.updated_at as string | null) ?? null,
  };
}

export async function saveCurrencyRateSettings(input: {
  usdToZmwRate: number;
  source: "live" | "manual";
}): Promise<boolean> {
  const supabase = createServiceClient();
  if (!supabase) return false;

  const usdToZmwRate = parseRate(input.usdToZmwRate);
  if (!usdToZmwRate) return false;

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("site_settings").upsert({
    setting_key: CURRENCY_SETTINGS_KEY,
    setting_value: {
      usd_to_zmw_rate: usdToZmwRate,
      source: input.source,
      updated_at: updatedAt,
    },
    updated_at: updatedAt,
  });

  return !error;
}

const MERCHANT_DEPOSITS_KEY = "merchant_deposits";

export interface MerchantDepositSettings {
  mtn: string;
  airtel: string;
  binancePayId: string;
  usdtTrc20Address: string;
  updatedAt: string | null;
}

function trimMerchantField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function getMerchantDepositSettings(): Promise<MerchantDepositSettings> {
  const supabase = createServiceClient();
  if (!supabase) {
    return {
      mtn: "",
      airtel: "",
      binancePayId: "",
      usdtTrc20Address: "",
      updatedAt: null,
    };
  }

  const { data } = await supabase
    .from("site_settings")
    .select("setting_value, updated_at")
    .eq("setting_key", MERCHANT_DEPOSITS_KEY)
    .maybeSingle();

  const settingValue = (data?.setting_value as Record<string, unknown> | null) ?? null;

  return {
    mtn: trimMerchantField(settingValue?.mtn),
    airtel: trimMerchantField(settingValue?.airtel),
    binancePayId: trimMerchantField(settingValue?.binance_pay_id),
    usdtTrc20Address: trimMerchantField(settingValue?.usdt_trc20_address),
    updatedAt: data?.updated_at ?? (settingValue?.updated_at as string | null) ?? null,
  };
}

export async function saveMerchantDepositSettings(input: {
  mtn: string;
  airtel: string;
  binancePayId: string;
  usdtTrc20Address: string;
}): Promise<boolean> {
  const supabase = createServiceClient();
  if (!supabase) return false;

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("site_settings").upsert({
    setting_key: MERCHANT_DEPOSITS_KEY,
    setting_value: {
      mtn: trimMerchantField(input.mtn),
      airtel: trimMerchantField(input.airtel),
      binance_pay_id: trimMerchantField(input.binancePayId),
      usdt_trc20_address: trimMerchantField(input.usdtTrc20Address),
      updated_at: updatedAt,
    },
    updated_at: updatedAt,
  });

  return !error;
}