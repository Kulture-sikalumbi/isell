/**
 * Read server env at runtime using a dynamic key.
 *
 * Next.js can inline `process.env.RESEND_API_KEY` at build time. If the CI build
 * does not have Azure secrets, production bundles get `undefined` even when App
 * Service settings are correct. Dynamic access avoids that.
 */
export function runtimeEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const value = process.env[name];
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

/** Snapshot of email-related server env (for health checks and sending). */
export function getServerEmailEnv() {
  const apiKey = runtimeEnv("RESEND_API_KEY");
  const rawFrom = runtimeEnv("EMAIL_FROM");
  const appUrl = runtimeEnv("NEXT_PUBLIC_APP_URL");
  const serviceRole = runtimeEnv("SUPABASE_SERVICE_ROLE_KEY");

  return {
    apiKey,
    rawFrom,
    appUrl,
    serviceRole,
    from: rawFrom
      ? rawFrom.includes("<")
        ? rawFrom
        : `iSell Unlocks <${rawFrom}>`
      : "iSell Unlocks <onboarding@resend.dev>",
    ready: Boolean(apiKey && rawFrom && serviceRole && appUrl),
  };
}
