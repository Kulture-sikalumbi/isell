/** Safe internal path only — blocks open redirects. */
export function sanitizeNextPath(next: string | null | undefined, fallback = "/tools"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

/**
 * Admins → control panel by default.
 * Customers → tools catalog by default (explicit dashboard deep-links still work).
 */
export function resolvePostLoginPath(next: string, isAdminUser: boolean): string {
  const safe = sanitizeNextPath(next);

  if (isAdminUser) {
    if (safe.startsWith("/admin")) return safe;
    if (safe.startsWith("/tools")) return safe;

    if (safe === "/" || safe === "/dashboard" || safe.startsWith("/dashboard?")) {
      return "/admin";
    }

    return safe;
  }

  if (safe === "/" || safe === "/dashboard") {
    return "/tools";
  }

  return safe;
}
