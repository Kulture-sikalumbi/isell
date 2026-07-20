import { cookies } from "next/headers";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export type DisplayCurrency = "ZMW" | "USD";

export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = "USD";

export const DISPLAY_CURRENCY_COOKIE = "display_currency";

export function normalizeDisplayCurrency(value?: string | null): DisplayCurrency | null {
  const code = value?.trim().toUpperCase();
  if (code === "ZMW" || code === "USD") return code;
  return null;
}

export async function getUserDisplayCurrency(userId: string): Promise<DisplayCurrency | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("display_currency")
    .eq("id", userId)
    .maybeSingle();

  return normalizeDisplayCurrency(data?.display_currency);
}

export async function getDisplayCurrencyPreference(): Promise<DisplayCurrency | null> {
  const user = await getCurrentUser();
  if (user) {
    const profile = await getCurrentProfile();
    const fromProfile = normalizeDisplayCurrency(profile?.display_currency);
    if (fromProfile) return fromProfile;
  }

  const cookieStore = await cookies();
  return normalizeDisplayCurrency(cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value);
}

export async function saveDisplayCurrencyPreference(
  userId: string,
  currency: DisplayCurrency
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const normalized = normalizeDisplayCurrency(currency);
  if (!normalized) return { ok: false, error: "Invalid currency" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_currency: normalized })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  // Align wallet currency when empty so deposits match chosen currency
  const { data: wallet } = await supabase
    .from("user_wallets")
    .select("balance, currency")
    .eq("user_id", userId)
    .maybeSingle();

  if (wallet && Number(wallet.balance) === 0 && wallet.currency !== normalized) {
    await supabase
      .from("user_wallets")
      .update({ currency: normalized, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  return { ok: true };
}

/** First-time customers land in USD — they can switch to ZMW from the menu later. */
export async function ensureDefaultDisplayCurrencyForUser(
  userId: string
): Promise<DisplayCurrency | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_currency")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.role === "admin") return null;

  const existing = normalizeDisplayCurrency(profile.display_currency);
  if (existing) return existing;

  const result = await saveDisplayCurrencyPreference(userId, DEFAULT_DISPLAY_CURRENCY);
  return result.ok ? DEFAULT_DISPLAY_CURRENCY : null;
}

export function displayCurrencyCookieOptions(currency: DisplayCurrency) {
  return {
    name: DISPLAY_CURRENCY_COOKIE,
    value: currency,
    path: "/",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 365,
  };
}
