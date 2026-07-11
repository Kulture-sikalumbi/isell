import { getServerEmailEnv } from "@/lib/runtime-env";

export function getEmailConfigStatus() {
  const env = getServerEmailEnv();

  return {
    resendConfigured: Boolean(env.apiKey),
    resendKeyLength: env.apiKeyLength,
    emailFrom: env.rawFrom || null,
    emailFromFormatted: env.from,
    appUrl: env.appUrl || null,
    serviceRoleConfigured: Boolean(env.serviceRole),
    ready: env.ready,
    detectedKeyNames: env.detectedKeyNames,
    emailConfigSource: env.emailConfigSource,
  };
}
