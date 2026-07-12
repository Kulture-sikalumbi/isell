import type { NextRequest, NextResponse } from "next/server";

const PRIVATE_IP =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc00:|fd)/;

/** Extract the visitor's public IP — works with Azure App Service / Front Door proxies. */
export function clientIpFromRequest(request: NextRequest): string | null {
  const candidates = [
    request.headers.get("x-azure-clientip"),
    request.headers.get("x-client-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];

  for (const raw of candidates) {
    const ip = raw?.trim();
    if (!ip || PRIVATE_IP.test(ip)) continue;
    return ip;
  }

  return null;
}

/** Country code from CDN / edge headers when present (Azure Front Door rules, Cloudflare, etc.). */
export function countryFromEdgeHeaders(request: NextRequest): string | null {
  const raw =
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("x-country-code") ||
    request.headers.get("x-country") ||
    request.headers.get("x-geo-country");

  const code = raw?.trim().toUpperCase();
  if (!code || code.length !== 2 || code === "XX" || code === "T1") return null;
  return code;
}

let ipLookupBlockedUntil = 0;

/**
 * Resolve ISO country from IP (for Azure App Service where geo headers are absent).
 * Uses ipapi.co — result is cached per visitor via middleware cookies afterward.
 */
export async function lookupCountryFromIp(ip: string): Promise<string | null> {
  if (Date.now() < ipLookupBlockedUntil) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country_code/`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "iSellUnlocks/1.0" },
    });
    clearTimeout(timer);

    if (res.status === 429) {
      ipLookupBlockedUntil = Date.now() + 60_000;
      return null;
    }

    if (!res.ok) return null;

    const code = (await res.text()).trim().toUpperCase();
    if (!code || code.length !== 2 || code === "XX") return null;
    return code;
  } catch {
    return null;
  }
}

export async function resolveSiteCountry(request: NextRequest): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    const devCountry = process.env.DEV_SITE_COUNTRY?.trim().toUpperCase();
    if (devCountry) return devCountry;
    const siteCurrency = process.env.NEXT_PUBLIC_SITE_CURRENCY?.trim().toUpperCase();
    if (siteCurrency === "ZMW") return "ZM";
  }

  const cookieCountry = request.cookies.get("site_country")?.value?.trim().toUpperCase();
  if (cookieCountry && cookieCountry.length === 2) return cookieCountry;

  const edgeCountry = countryFromEdgeHeaders(request);
  if (edgeCountry) return edgeCountry;

  const ip = clientIpFromRequest(request);
  if (ip) {
    const fromIp = await lookupCountryFromIp(ip);
    if (fromIp) return fromIp;
  }

  const defaultCountry = process.env.SITE_DEFAULT_COUNTRY?.trim().toUpperCase();
  if (defaultCountry && defaultCountry.length === 2) return defaultCountry;

  return "US";
}

const GEO_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function stampSiteGeoOnResponse(
  response: NextResponse,
  country: string,
  currency: string
) {
  response.cookies.set("site_country", country, {
    path: "/",
    sameSite: "lax",
    maxAge: GEO_COOKIE_MAX_AGE,
  });
  response.cookies.set("site_currency", currency, {
    path: "/",
    sameSite: "lax",
    maxAge: GEO_COOKIE_MAX_AGE,
  });
}
