/**
 * Read server env at runtime — avoids Next.js baking `undefined` at build time.
 *
 * CI builds without secrets can inline static `process.env.RESEND_API_KEY` as
 * undefined. Use dynamic key construction so Azure App Service settings work
 * at request time.
 */
function sanitizeEnvValue(value: string): string {
  let v = value.trim();
  // Azure App Settings sometimes include wrapping quotes — breaks Resend auth.
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  // Common Azure mistake: value set to "RESEND_API_KEY=re_xxx" instead of just "re_xxx"
  const keyPrefixMatch = v.match(/^[A-Z0-9_]+=(.+)$/);
  if (keyPrefixMatch) {
    v = keyPrefixMatch[1].trim();
  }
  return v;
}

function readEnvKey(key: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const value = process.env[key];
  if (value == null) return undefined;
  const trimmed = sanitizeEnvValue(String(value));
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

/** Snapshot of email-related server env (for health checks and sending). */
export function getServerEmailEnv() {
  const envApiKey = runtimeEnvParts("RESEND", "API", "KEY");
  const envFrom = runtimeEnvParts("EMAIL", "FROM");
  const envAppUrl = runtimeEnvParts("NEXT", "PUBLIC", "APP", "URL");
  const serviceRole = runtimeEnvParts("SUPABASE", "SERVICE", "ROLE", "KEY");

  const apiKey = envApiKey;
  const rawFrom = envFrom;
  const appUrl = envAppUrl;

  return {
    apiKey,
    rawFrom,
    appUrl,
    serviceRole,
    from: rawFrom
      ? rawFrom.includes("<")
        ? rawFrom
        : `iSell Unlocks <${rawFrom}>`
      : "",
    ready: Boolean(apiKey && rawFrom && appUrl),
    apiKeyLength: apiKey?.length ?? 0,
    resendKeyPrefix: apiKey ? `${apiKey.slice(0, 8)}…` : null,
    resendKeyLooksValid: Boolean(apiKey?.startsWith("re_")),
    detectedKeyNames: listRuntimeEnvKeyNames(),
    emailConfigSource: {
      resendApiKey: envApiKey ? "env" : "missing",
      emailFrom: envFrom ? "env" : "missing",
      appUrl: envAppUrl ? "env" : "missing",
    },
  };
}
