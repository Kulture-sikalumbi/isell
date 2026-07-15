import { runtimeEnv } from "@/lib/runtime-env";
import { createServiceClient } from "@/lib/supabase/server";
import {
  confirmDepositFromProvider,
  setDepositProviderReference,
  updateDepositProviderStatus,
} from "@/lib/wallet";
import type { WalletDeposit } from "@/types/database";

export type MomoGatewayMethod = "mtn" | "airtel";

export interface MomoSmsWebhookPayload {
  transactionId: string;
  amount: number;
  method?: MomoGatewayMethod;
  /** Raw SMS sender id, e.g. MTNMoMo */
  sender?: string;
  senderPhone?: string;
  senderName?: string;
  rawMessage?: string;
  receivedAt?: string;
}

export type MomoWebhookResult =
  | { ok: true; action: "confirmed"; depositId: string; reference: string; balance?: number }
  | { ok: true; action: "already_confirmed"; depositId: string; reference: string }
  | { ok: true; action: "recorded"; depositId: string; reference: string; message: string }
  | {
      ok: false;
      error: string;
      code: "unauthorized" | "invalid_payload" | "not_found" | "ambiguous" | "failed";
      retryable?: boolean;
    };

const PROVIDER = "momo_sms_gateway";

export function isMomoSmsGatewayAuthorized(request: Request): boolean {
  const token = runtimeEnv("MOMO_SMS_GATEWAY_TOKEN");
  if (!token) return false;

  const incoming =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-gateway-token");

  return incoming === token;
}

export function mapSmsSenderToMethod(sender?: string): MomoGatewayMethod | null {
  if (!sender) return null;
  const normalized = sender.trim().toLowerCase();

  if (normalized.includes("mtn") || normalized.includes("momo")) return "mtn";
  if (normalized.includes("airtel")) return "airtel";
  return null;
}

export function normalizeZambiaPhone(value?: string | null): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("260") && digits.length >= 12) return digits.slice(-9);
  if (digits.length >= 9) return digits.slice(-9);
  return digits;
}

export function normalizeTransactionId(value?: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

function amountsMatch(depositAmount: number, smsAmount: number): boolean {
  return Math.abs(Number(depositAmount) - Number(smsAmount)) < 0.01;
}

function matchWindowHours(): number {
  const raw = runtimeEnv("MOMO_SMS_MATCH_WINDOW_HOURS");
  const parsed = raw ? Number(raw) : 48;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 48;
}

function matchWindowStartIso(): string {
  const hours = matchWindowHours();
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function normalizeName(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Soft name similarity: shared tokens of length >= 3. */
function namesLikelyMatch(a?: string | null, b?: string | null): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;

  const tokensA = left.split(" ").filter((t) => t.length >= 3);
  const tokensB = new Set(right.split(" ").filter((t) => t.length >= 3));
  if (tokensA.length === 0 || tokensB.size === 0) return false;
  const shared = tokensA.filter((t) => tokensB.has(t)).length;
  return shared >= Math.min(2, tokensA.length);
}

function scoreDepositMatch(
  deposit: WalletDeposit,
  payload: MomoSmsWebhookPayload,
  method: MomoGatewayMethod
): number {
  let score = 0;

  if (deposit.method !== method) return -1;
  if (!amountsMatch(Number(deposit.amount), payload.amount)) return -1;

  // Skip legacy MTN API intents (abandoned gateway experiment) — manual SMS only.
  if (deposit.provider === "mtn_momo") return -1;

  score += 10;

  const payloadTxn = normalizeTransactionId(payload.transactionId);
  const depositTxn = normalizeTransactionId(deposit.transaction_id);

  if (depositTxn && payloadTxn && depositTxn === payloadTxn) score += 100;
  else if (depositTxn && payloadTxn && depositTxn !== payloadTxn) return -1;

  const payloadPhone = normalizeZambiaPhone(payload.senderPhone);
  const depositPhone = normalizeZambiaPhone(deposit.sender_phone);
  if (payloadPhone && depositPhone && payloadPhone === depositPhone) score += 35;

  if (namesLikelyMatch(payload.senderName, deposit.sender_name)) score += 25;

  // Prefer newer pending deposits when scores otherwise equal (handled by sort + created_at).
  return score;
}

/**
 * Minimum match strength before auto-processing.
 * TID match alone (110) or phone+name with amount (70) qualify.
 * Amount-only (10) does not.
 */
const MIN_AUTO_MATCH_SCORE = 45;

async function findDepositByTransactionId(transactionId: string) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const normalized = normalizeTransactionId(transactionId);

  // Exact match first (customers usually paste as shown).
  const { data: exact } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("transaction_id", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exact) return exact as WalletDeposit;

  // Case-insensitive fallback for lowercase pastes / Airtel TIDs.
  const { data: pending } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("status", "pending")
    .gte("created_at", matchWindowStartIso())
    .order("created_at", { ascending: false })
    .limit(50);

  const soft = ((pending ?? []) as WalletDeposit[]).find(
    (d) => normalizeTransactionId(d.transaction_id) === normalized
  );
  return soft ?? null;
}

async function findPendingDepositsForMatch(
  method: MomoGatewayMethod,
  amount: number
): Promise<WalletDeposit[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  // Fetch pending for method in window, then filter amount in JS
  // (avoids decimal string vs number mismatches in PostgREST).
  const { data } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("status", "pending")
    .eq("method", method)
    .gte("created_at", matchWindowStartIso())
    .order("created_at", { ascending: false })
    .limit(40);

  return ((data ?? []) as WalletDeposit[]).filter((d) => amountsMatch(Number(d.amount), amount));
}

async function attachGatewayMetadata(
  depositId: string,
  payload: MomoSmsWebhookPayload,
  providerStatus: string
) {
  await setDepositProviderReference({
    depositId,
    provider: PROVIDER,
    providerReference: normalizeTransactionId(payload.transactionId),
    providerStatus,
    providerPayload: {
      sender: payload.sender ?? null,
      senderPhone: payload.senderPhone ?? null,
      senderName: payload.senderName ?? null,
      rawMessage: payload.rawMessage ?? null,
      receivedAt: payload.receivedAt ?? new Date().toISOString(),
    },
  });
}

export async function processMomoSmsWebhook(
  payload: MomoSmsWebhookPayload
): Promise<MomoWebhookResult> {
  const transactionId = normalizeTransactionId(payload.transactionId);
  const amount = Number(payload.amount);

  if (!transactionId) {
    return { ok: false, error: "transactionId is required", code: "invalid_payload" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "amount must be a positive number", code: "invalid_payload" };
  }

  const method = payload.method ?? mapSmsSenderToMethod(payload.sender);
  if (!method) {
    return {
      ok: false,
      error: "Could not determine payment method — pass method or a known sender id",
      code: "invalid_payload",
    };
  }

  const existingByTxn = await findDepositByTransactionId(transactionId);
  if (existingByTxn?.status === "confirmed") {
    return {
      ok: true,
      action: "already_confirmed",
      depositId: existingByTxn.id,
      reference: existingByTxn.reference,
    };
  }

  let deposit = existingByTxn?.status === "pending" ? existingByTxn : null;

  if (!deposit) {
    const candidates = await findPendingDepositsForMatch(method, amount);
    const scored = candidates
      .map((candidate) => ({
        candidate,
        score: scoreDepositMatch(candidate, payload, method),
      }))
      .filter((entry) => entry.score >= MIN_AUTO_MATCH_SCORE)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Tie-break: newest pending deposit first
        return (
          new Date(b.candidate.created_at).getTime() -
          new Date(a.candidate.created_at).getTime()
        );
      });

    if (scored.length === 0) {
      return {
        ok: false,
        error:
          "No confident match — customer may not have submitted TID yet, or details differ. Admin can confirm manually.",
        code: "not_found",
      };
    }

    // Ambiguous only when top two share the exact same score AND were created within 2 minutes
    // (two customers depositing the same amount at nearly the same time).
    if (scored.length > 1 && scored[0].score === scored[1].score) {
      const t0 = new Date(scored[0].candidate.created_at).getTime();
      const t1 = new Date(scored[1].candidate.created_at).getTime();
      if (Math.abs(t0 - t1) < 2 * 60 * 1000) {
        return {
          ok: false,
          error: "Multiple pending deposits match — admin must confirm manually",
          code: "ambiguous",
        };
      }
    }

    deposit = scored[0].candidate;
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return { ok: false, error: "Database not configured", code: "failed" };
  }

  // Attach SMS TID / sender if customer has not submitted yet, or normalize case.
  const depositTxn = normalizeTransactionId(deposit.transaction_id);
  if (!depositTxn || depositTxn !== transactionId) {
    // Never overwrite a different customer-submitted TID.
    if (depositTxn && depositTxn !== transactionId) {
      return {
        ok: false,
        error: "SMS TID does not match the TID already on this deposit",
        code: "ambiguous",
      };
    }

    const { error } = await supabase
      .from("wallet_deposits")
      .update({
        transaction_id: transactionId,
        sender_phone: payload.senderPhone?.trim() || deposit.sender_phone,
        sender_name: payload.senderName?.trim() || deposit.sender_name,
      })
      .eq("id", deposit.id)
      .eq("status", "pending");

    if (error) {
      return { ok: false, error: error.message, code: "failed" };
    }
  } else if (payload.senderPhone || payload.senderName) {
    await supabase
      .from("wallet_deposits")
      .update({
        sender_phone: payload.senderPhone?.trim() || deposit.sender_phone,
        sender_name: payload.senderName?.trim() || deposit.sender_name,
      })
      .eq("id", deposit.id)
      .eq("status", "pending");
  }

  await attachGatewayMetadata(deposit.id, payload, "MATCHED");

  const autoConfirm = runtimeEnv("MOMO_SMS_AUTO_CONFIRM") !== "false";
  if (!autoConfirm) {
    await updateDepositProviderStatus({
      depositId: deposit.id,
      providerStatus: "AWAITING_ADMIN",
      providerPayload: { matchedFromSms: true },
    });
    return {
      ok: true,
      action: "recorded",
      depositId: deposit.id,
      reference: deposit.reference,
      message: "Deposit matched from SMS — awaiting admin confirmation",
    };
  }

  // Guard: another webhook/request may have confirmed while we were matching.
  const { data: latest } = await supabase
    .from("wallet_deposits")
    .select("status, reference")
    .eq("id", deposit.id)
    .maybeSingle();

  if (latest?.status === "confirmed") {
    return {
      ok: true,
      action: "already_confirmed",
      depositId: deposit.id,
      reference: latest.reference ?? deposit.reference,
    };
  }

  const result = await confirmDepositFromProvider(
    deposit.id,
    `Auto-confirmed from MoMo SMS gateway (${transactionId})`
  );

  if (!result.ok) {
    // Race: confirm_wallet_deposit may report already processed.
    if (/already/i.test(result.error ?? "")) {
      return {
        ok: true,
        action: "already_confirmed",
        depositId: deposit.id,
        reference: deposit.reference,
      };
    }
    return { ok: false, error: result.error ?? "Failed to confirm deposit", code: "failed" };
  }

  if (result.alreadyConfirmed) {
    return {
      ok: true,
      action: "already_confirmed",
      depositId: deposit.id,
      reference: deposit.reference,
    };
  }

  return {
    ok: true,
    action: "confirmed",
    depositId: deposit.id,
    reference: deposit.reference,
    balance: result.balance,
  };
}
