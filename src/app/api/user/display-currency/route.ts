import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import {
  displayCurrencyCookieOptions,
  normalizeDisplayCurrency,
  saveDisplayCurrencyPreference,
} from "@/lib/display-currency-preference";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getCurrentProfile();
  const currency = normalizeDisplayCurrency(profile?.display_currency);

  return NextResponse.json({
    currency,
    needsSelection: !currency,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const currency = normalizeDisplayCurrency(body.currency);
  if (!currency) {
    return NextResponse.json({ error: "Choose ZMW or USD" }, { status: 400 });
  }

  const result = await saveDisplayCurrencyPreference(user.id, currency);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, currency });
  const cookie = displayCurrencyCookieOptions(currency);
  response.cookies.set(cookie.name, cookie.value, {
    path: cookie.path,
    sameSite: cookie.sameSite,
    maxAge: cookie.maxAge,
  });
  response.cookies.set("site_currency", currency, {
    path: "/",
    sameSite: "lax",
    maxAge: cookie.maxAge,
  });
  response.cookies.set(
    "site_country",
    currency === "ZMW" ? "ZM" : "US",
    { path: "/", sameSite: "lax", maxAge: cookie.maxAge }
  );

  return response;
}
