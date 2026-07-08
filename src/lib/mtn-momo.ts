import { randomUUID } from "crypto";

type MtnAuthMode = "oauth_client_credentials" | "basic";

interface MtnConfig {
  baseUrl: string;
  tokenPath: string;
  requestToPayPath: string;
  requestStatusPath: string;
  targetEnvironment: string;
  consumerKey: string;
  consumerSecret: string;
  subscriptionKey: string | null;
  callbackAuthToken: string;
  authMode: MtnAuthMode;
}

export type MtnPaymentState =
  | "SUCCESSFUL"
  | "FAILED"
  | "PENDING"
  | "REJECTED"
  | "TIMEOUT"
  | "UNKNOWN";

export interface MtnRequestToPayInput {
  amount: number;
  currency: string;
  phoneNumber: string;
  externalId: string;
  payerMessage: string;
  payeeNote: string;
}

export interface MtnRequestToPayResult {
  referenceId: string;
}

export interface MtnPaymentStatusResult {
  state: MtnPaymentState;
  raw: Record<string, unknown>;
}

function required(name: string, value?: string) {
  if (!value?.trim()) {
    throw new Error(`Missing MTN config: ${name}`);
  }
  return value.trim();
}

function resolveAuthMode(): MtnAuthMode {
  const raw = process.env.MTN_MOMO_AUTH_MODE?.trim().toLowerCase();
  if (raw === "basic" || raw === "legacy") return "basic";
  return "oauth_client_credentials";
}

function resolveConsumerCredentials() {
  const consumerKey =
    process.env.MTN_MOMO_CONSUMER_KEY?.trim() ||
    process.env.MTN_MOMO_COLLECTION_API_USER?.trim();
  const consumerSecret =
    process.env.MTN_MOMO_CONSUMER_SECRET?.trim() ||
    process.env.MTN_MOMO_COLLECTION_API_KEY?.trim();

  return {
    consumerKey: required(
      "MTN_MOMO_CONSUMER_KEY (or MTN_MOMO_COLLECTION_API_USER)",
      consumerKey
    ),
    consumerSecret: required(
      "MTN_MOMO_CONSUMER_SECRET (or MTN_MOMO_COLLECTION_API_KEY)",
      consumerSecret
    ),
  };
}

function getConfig(): MtnConfig {
  const authMode = resolveAuthMode();
  const { consumerKey, consumerSecret } = resolveConsumerCredentials();
  const baseUrl = required(
    "MTN_MOMO_BASE_URL",
    process.env.MTN_MOMO_BASE_URL || "https://api.mtn.com"
  );

  const defaultTokenPath =
    authMode === "oauth_client_credentials"
      ? "/oauth/client_credential/accesstoken"
      : "/collection/token/";

  return {
    baseUrl,
    tokenPath: process.env.MTN_MOMO_TOKEN_PATH?.trim() || defaultTokenPath,
    requestToPayPath:
      process.env.MTN_MOMO_REQUEST_TO_PAY_PATH?.trim() || "/collection/v1_0/requesttopay",
    requestStatusPath:
      process.env.MTN_MOMO_REQUEST_STATUS_PATH?.trim() || "/collection/v1_0/requesttopay/{id}",
    targetEnvironment: process.env.MTN_MOMO_TARGET_ENVIRONMENT?.trim() || "sandbox",
    consumerKey,
    consumerSecret,
    subscriptionKey: process.env.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY?.trim() || null,
    callbackAuthToken: process.env.MTN_MOMO_CALLBACK_TOKEN?.trim() || "",
    authMode,
  };
}

function sanitizeMsisdn(value: string) {
  return value.replace(/[^\d]/g, "");
}

function withOptionalSubscriptionKey(
  config: MtnConfig,
  headers: Record<string, string>
): Record<string, string> {
  if (!config.subscriptionKey) return headers;
  return {
    ...headers,
    "Ocp-Apim-Subscription-Key": config.subscriptionKey,
  };
}

function extractAccessToken(data: Record<string, unknown>) {
  if (typeof data.access_token === "string") return data.access_token;
  return null;
}

async function getAccessToken(config: MtnConfig): Promise<string> {
  const tokenUrl = new URL(config.tokenPath, config.baseUrl);

  if (config.authMode === "oauth_client_credentials") {
    tokenUrl.searchParams.set("grant_type", "client_credentials");

    const res = await fetch(tokenUrl.toString(), {
      method: "POST",
      headers: withOptionalSubscriptionKey(config, {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Target-Environment": config.targetEnvironment,
      }),
      body: new URLSearchParams({
        client_id: config.consumerKey,
        client_secret: config.consumerSecret,
      }).toString(),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const token = extractAccessToken(data);
    if (!res.ok || !token) {
      const reason =
        typeof data.error_description === "string"
          ? data.error_description
          : typeof data.message === "string"
            ? data.message
            : "Failed";
      throw new Error(`MTN auth failed: ${reason}`);
    }

    return token;
  }

  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const res = await fetch(tokenUrl.toString(), {
    method: "POST",
    headers: withOptionalSubscriptionKey(config, {
      Authorization: `Basic ${auth}`,
      "X-Target-Environment": config.targetEnvironment,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const token = extractAccessToken(data);
  if (!res.ok || !token) {
    const reason = typeof data.error_description === "string" ? data.error_description : "Failed";
    throw new Error(`MTN auth failed: ${reason}`);
  }

  return token;
}

function apiHeaders(config: MtnConfig, token: string, extra?: Record<string, string>) {
  return withOptionalSubscriptionKey(config, {
    Authorization: `Bearer ${token}`,
    "X-Target-Environment": config.targetEnvironment,
    ...extra,
  });
}

export async function initiateMtnRequestToPay(
  input: MtnRequestToPayInput
): Promise<MtnRequestToPayResult> {
  const config = getConfig();
  const referenceId = randomUUID();
  const token = await getAccessToken(config);
  const requestUrl = new URL(config.requestToPayPath, config.baseUrl).toString();

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: apiHeaders(config, token, {
      "X-Reference-Id": referenceId,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      amount: input.amount.toFixed(2),
      currency: input.currency,
      externalId: input.externalId,
      payer: {
        partyIdType: "MSISDN",
        partyId: sanitizeMsisdn(input.phoneNumber),
      },
      payerMessage: input.payerMessage,
      payeeNote: input.payeeNote,
    }),
    cache: "no-store",
  });

  if (response.status !== 202 && response.status !== 201) {
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const detail = typeof body.message === "string" ? body.message : response.statusText;
    throw new Error(`MTN request-to-pay failed: ${detail}`);
  }

  return { referenceId };
}

export async function queryMtnPaymentStatus(referenceId: string): Promise<MtnPaymentStatusResult> {
  const config = getConfig();
  const token = await getAccessToken(config);
  const path = config.requestStatusPath.replace("{id}", referenceId);
  const requestUrl = new URL(path, config.baseUrl).toString();

  const response = await fetch(requestUrl, {
    method: "GET",
    headers: apiHeaders(config, token),
    cache: "no-store",
  });

  const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error("MTN status check failed");
  }

  const status = String(raw.status ?? raw.financialTransactionStatus ?? "UNKNOWN").toUpperCase();
  const state: MtnPaymentState =
    status === "SUCCESSFUL" || status === "FAILED" || status === "PENDING" || status === "REJECTED"
      ? (status as MtnPaymentState)
      : status === "TIMEOUT"
        ? "TIMEOUT"
        : "UNKNOWN";

  return { state, raw };
}

export function isMtnCallbackAuthorized(request: Request) {
  const config = getConfig();
  if (!config.callbackAuthToken) return true;
  const incoming =
    request.headers.get("x-callback-token") ||
    request.headers.get("x-mtn-callback-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return incoming === config.callbackAuthToken;
}
