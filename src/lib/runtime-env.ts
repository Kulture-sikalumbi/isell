/**
 * Read server env at runtime — avoids Next.js baking `undefined` at build time.
 *
 * CI builds without secrets can inline static `process.env.RESEND_API_KEY` as
 * undefined. Use dynamic key construction so Azure App Service settings work
 * at request time.
 */
function readEnvKey(key: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const value = process.env[key];
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

/** Build env key from segments so bundlers cannot constant-fold the lookup. */
function envKey(...segments: string[]): string {
  const sep = String.fromCharCode(95);
  return segments.join(sep);
}

export function runtimeEnv(name: string): string | undefined {
  return readEnvKey(name);
}

export function runtimeEnvParts(...segments: string[]): string | undefined {
  return readEnvKey(envKey(...segments));
}

/** Names of email-related keys present in process.env (for diagnostics). */
export function listRuntimeEnvKeyNames(): string[] {
  if (typeof process === "undefined" || !process.env) return [];
  return Object.keys(process.env).filter((k) =>
    /^(RESEND|EMAIL|SUPABASE_SERVICE|NEXT_PUBLIC_APP)/i.test(k)
  );
}

/**
 * TEMP — Azure email debug: hardcoded fallbacks when server env is empty.
 * Remove after confirming production email works (do not ship API keys long-term).
 */
const HARDCODED_EMAIL_FALLBACK = {
  apiKey: "re_73Ctre3N_Ez113xp8GaUZkSd8mGBSQvvG",
  from: "orders@isellunlocks.com",
  appUrl: "https://isellunlocks.com",
} as const;

/** Snapshot of email-related server env (for health checks and sending). */
export function getServerEmailEnv() {
  const envApiKey = runtimeEnvParts("RESEND", "API", "KEY");
  const envFrom = runtimeEnvParts("EMAIL", "FROM");
  const envAppUrl = runtimeEnvParts("NEXT", "PUBLIC", "APP", "URL");
  const serviceRole = runtimeEnvParts("SUPABASE", "SERVICE", "ROLE", "KEY");

  const apiKey = envApiKey || HARDCODED_EMAIL_FALLBACK.apiKey;
  const rawFrom = envFrom || HARDCODED_EMAIL_FALLBACK.from;
  const appUrl = envAppUrl || HARDCODED_EMAIL_FALLBACK.appUrl;

  return {
    apiKey,
    rawFrom,
    appUrl,
    serviceRole,
    from: rawFrom.includes("<")
      ? rawFrom
      : `iSell Unlocks <${rawFrom}>`,
    ready: Boolean(apiKey && rawFrom && appUrl),
    apiKeyLength: apiKey?.length ?? 0,
    detectedKeyNames: listRuntimeEnvKeyNames(),
    emailConfigSource: {
      resendApiKey: envApiKey ? "env" : "hardcoded-fallback",
      emailFrom: envFrom ? "env" : "hardcoded-fallback",
      appUrl: envAppUrl ? "env" : "hardcoded-fallback",
    },
  };
}
