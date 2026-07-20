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
      ok: true;
      action: "stored";
      transactionId: string;
      message: string;
    }
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

function normalizeSenderKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function looksLikePersonalPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 9) return true;
  if (/^\+?\d{7,}$/.test(trimmed.replace(/[\s()-]/g, ""))) return true;
  return false;
}

function classifyTrustedMoMoSender(sender?: string | null): MomoGatewayMethod | null {
  if (!sender?.trim()) return null;
  if (looksLikePersonalPhone(sender)) return null;

  const key = normalizeSenderKey(sender);
  if (!key) return null;

  if (
    key === "momo" ||
    key.includes("mtnmomo") ||
    key.includes("momomtn") ||
    key.includes("mtnmobilemoney") ||
    /^momo.*mtn$/.test(key) ||
    /^mtn.*momo$/.test(key)
  ) {
    return "mtn";
  }

  // Real ZM Airtel Money inbox label: "AirtelMoney".
  if (key.includes("airtelmoney")) return "airtel";

  return null;
}

/** Reject forwarded / spoofed SMS that did not arrive from official MoMo short codes. */
export function isTrustedMoMoGatewaySender(sender?: string | null): boolean {
  return classifyTrustedMoMoSender(sender) !== null;
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

/**
 * Customer-facing proof identifier stored for matching.
 * - Airtel dotted TID `PP260719.1058.L21552` → `L21552` (last segment only)
 * - MTN Financial Transaction ID → full digits (typically 10 digits)
 */
export function extractProofCode(
  transactionId?: string | null,
  method?: MomoGatewayMethod | string | null
): string {
  const normalized = normalizeTransactionId(transactionId);
  if (!normalized) return "";

  if (method === "airtel" || (!method && normalized.includes("."))) {
    const parts = normalized.split(".").filter(Boolean);
    return parts[parts.length - 1] ?? normalized;
  }

  const digits = normalized.replace(/\D/g, "");
  return digits || normalized;
}

/** Whether a customer-submitted value matches a stored MoMo transaction id. */
export function transactionIdsMatch(
  submitted?: string | null,
  stored?: string | null,
  method?: MomoGatewayMethod | string | null
): boolean {
  const left = normalizeTransactionId(submitted);
  const right = normalizeTransactionId(stored);
  if (!left || !right) return false;
  if (left === right) return true;

  const m = method as MomoGatewayMethod | undefined;
  if (m === "airtel") {
    return extractProofCode(left, "airtel") === extractProofCode(right, "airtel");
  }
  if (m === "mtn") {
    const leftDigits = left.replace(/\D/g, "");
    const rightDigits = right.replace(/\D/g, "");
    return leftDigits.length > 0 && leftDigits === rightDigits;
  }

  // Unknown method — try both strategies.
  if (extractProofCode(left, "airtel") === extractProofCode(right, "airtel")) return true;
  const ld = left.replace(/\D/g, "");
  const rd = right.replace(/\D/g, "");
  return ld.length > 0 && ld === rd;
}

function proofCodesMatch(
  a?: string | null,
  b?: string | null,
  method?: MomoGatewayMethod | string | null
): boolean {
  return transactionIdsMatch(a, b, method);
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

  if (depositTxn && payloadTxn && proofCodesMatch(depositTxn, payloadTxn, method)) score += 100;
  else if (depositTxn && payloadTxn && !proofCodesMatch(depositTxn, payloadTxn, method)) return -1;

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

async function findDepositByTransactionId(
  transactionId: string,
  method?: MomoGatewayMethod | string
) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const normalized = normalizeTransactionId(transactionId);

  const { data: exact } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("transaction_id", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (exact) return exact as WalletDeposit;

  const { data: recent } = await supabase
    .from("wallet_deposits")
    .select("*")
    .gte("created_at", matchWindowStartIso())
    .order("created_at", { ascending: false })
    .limit(80);

  const soft = ((recent ?? []) as WalletDeposit[]).find((d) =>
    transactionIdsMatch(normalized, d.transaction_id, method ?? d.method)
  );
  return soft ?? null;
}

async function findPendingDepositByProof(
  method: MomoGatewayMethod,
  transactionId: string
): Promise<WalletDeposit | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("status", "pending")
    .eq("method", method)
    .gte("created_at", matchWindowStartIso())
    .order("created_at", { ascending: false })
    .limit(80);

  return (
    ((data ?? []) as WalletDeposit[]).find((d) =>
      transactionIdsMatch(transactionId, d.transaction_id, method)
    ) ?? null
  );
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

async function upsertSmsReceipt(
  payload: MomoSmsWebhookPayload,
  method: MomoGatewayMethod,
  transactionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const receivedAt = payload.receivedAt
    ? new Date(payload.receivedAt).toISOString()
    : new Date().toISOString();

  // Matching uses transaction_id + extractProofCode(); proof_code is optional
  // until migration 039 is applied on production.
  const baseRow = {
    transaction_id: transactionId,
    amount: Number(payload.amount),
    method,
    sender: payload.sender ?? null,
    sender_phone: payload.senderPhone?.trim() || null,
    sender_name: payload.senderName?.trim() || null,
    raw_message: payload.rawMessage ?? null,
    received_at: receivedAt,
  };

  let { error } = await supabase.from("momo_sms_receipts").upsert(
    {
      ...baseRow,
      proof_code: extractProofCode(transactionId, method),
    },
    { onConflict: "transaction_id", ignoreDuplicates: false }
  );

  // Production may still lack proof_code (CREATE TABLE IF NOT EXISTS skipped ALTER).
  if (error && /proof_code/i.test(error.message)) {
    ({ error } = await supabase
      .from("momo_sms_receipts")
      .upsert(baseRow, { onConflict: "transaction_id", ignoreDuplicates: false }));
  }

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

type SmsReceiptRow = {
  id: string;
  transaction_id: string;
  proof_code: string | null;
  amount: number;
  method: string;
  sender: string | null;
  sender_phone: string | null;
  sender_name: string | null;
  raw_message: string | null;
  received_at: string;
  matched_deposit_id: string | null;
};

async function findUnmatchedReceiptsByProof(
  method: string,
  proofOrTxn: string
): Promise<SmsReceiptRow[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const normalized = normalizeTransactionId(proofOrTxn);
  if (!normalized) return [];

  const { data } = await supabase
    .from("momo_sms_receipts")
    .select("*")
    .eq("method", method)
    .is("matched_deposit_id", null)
    .gte("received_at", matchWindowStartIso())
    .order("received_at", { ascending: false })
    .limit(40);

  return ((data ?? []) as SmsReceiptRow[]).filter((row) =>
    transactionIdsMatch(normalized, row.transaction_id, method)
  );
}

async function getSmsReceiptByTransactionId(
  transactionId: string
): Promise<SmsReceiptRow | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("momo_sms_receipts")
    .select("*")
    .eq("transaction_id", normalizeTransactionId(transactionId))
    .maybeSingle();

  return (data as SmsReceiptRow | null) ?? null;
}

async function markReceiptMatched(transactionId: string, depositId: string) {
  const supabase = createServiceClient();
  if (!supabase) return;
  await supabase
    .from("momo_sms_receipts")
    .update({ matched_deposit_id: depositId })
    .eq("transaction_id", normalizeTransactionId(transactionId))
    .is("matched_deposit_id", null);
}

/**
 * When a customer submits a (short) proof code, look up a stored SMS receipt and auto-confirm.
 * SMS amount is the source of truth — user-entered amount is only a disambiguation hint.
 */
export async function tryAutoConfirmFromSmsReceipt(input: {
  depositId: string;
  transactionId: string;
  amount?: number;
  method: string;
}): Promise<
  | { matched: false; reason?: string }
  | {
      matched: true;
      action: "confirmed" | "already_confirmed" | "recorded";
      reference?: string;
      balance?: number;
      creditedAmount?: number;
    }
> {
  const supabase = createServiceClient();
  if (!supabase) return { matched: false, reason: "db" };

  const submitted = normalizeTransactionId(input.transactionId);
  if (!submitted) return { matched: false, reason: "empty" };

  let receipts = await findUnmatchedReceiptsByProof(input.method, submitted);
  if (receipts.length === 0) {
    // Already-matched exact full TID (rare race) — fall through as no-op.
    return { matched: false, reason: "not_found" };
  }

  const hintAmount = Number(input.amount);
  if (receipts.length > 1 && Number.isFinite(hintAmount) && hintAmount > 0) {
    const byAmount = receipts.filter((r) => amountsMatch(hintAmount, Number(r.amount)));
    if (byAmount.length > 0) receipts = byAmount;
  }

  if (receipts.length > 1) {
    return { matched: false, reason: "ambiguous" };
  }

  const receipt = receipts[0];
  const fullTxn = normalizeTransactionId(receipt.transaction_id);
  const smsAmount = Number(receipt.amount);

  const { data: deposit } = await supabase
    .from("wallet_deposits")
    .select("*")
    .eq("id", input.depositId)
    .maybeSingle();

  if (!deposit || deposit.status !== "pending") {
    if (deposit?.status === "confirmed") {
      return {
        matched: true,
        action: "already_confirmed",
        reference: deposit.reference,
        creditedAmount: Number(deposit.amount),
      };
    }
    return { matched: false, reason: "deposit" };
  }

  // Authority: SMS amount + full TID + sender details from the merchant phone.
  const { error: syncError } = await supabase
    .from("wallet_deposits")
    .update({
      amount: smsAmount,
      transaction_id: fullTxn,
      sender_phone: receipt.sender_phone || deposit.sender_phone,
      sender_name: receipt.sender_name || deposit.sender_name,
    })
    .eq("id", deposit.id)
    .eq("status", "pending");

  if (syncError) return { matched: false, reason: syncError.message };

  await attachGatewayMetadata(
    deposit.id,
    {
      transactionId: fullTxn,
      amount: smsAmount,
      method: receipt.method as MomoGatewayMethod,
      sender: receipt.sender ?? undefined,
      senderPhone: receipt.sender_phone ?? undefined,
      senderName: receipt.sender_name ?? undefined,
      rawMessage: receipt.raw_message ?? undefined,
      receivedAt: receipt.received_at,
    },
    "MATCHED_FROM_STORED_SMS"
  );

  await markReceiptMatched(fullTxn, deposit.id);

  const autoConfirm = runtimeEnv("MOMO_SMS_AUTO_CONFIRM") !== "false";
  if (!autoConfirm) {
    await updateDepositProviderStatus({
      depositId: deposit.id,
      providerStatus: "AWAITING_ADMIN",
      providerPayload: { matchedFromStoredSms: true },
    });
    return {
      matched: true,
      action: "recorded",
      reference: deposit.reference,
      creditedAmount: smsAmount,
    };
  }

  const result = await confirmDepositFromProvider(
    deposit.id,
    `Auto-confirmed from stored MoMo SMS (${fullTxn})`
  );

  if (!result.ok) {
    if (/already/i.test(result.error ?? "")) {
      return {
        matched: true,
        action: "already_confirmed",
        reference: deposit.reference,
        creditedAmount: smsAmount,
      };
    }
    return { matched: false, reason: result.error };
  }

  return {
    matched: true,
    action: result.alreadyConfirmed ? "already_confirmed" : "confirmed",
    reference: deposit.reference,
    balance: result.balance,
    creditedAmount: smsAmount,
  };
}

/** Resolve an unmatched SMS receipt for MoMo proof submit (before creating a deposit). */
export async function resolveSmsReceiptForProof(input: {
  method: string;
  transactionId: string;
  amount?: number;
}): Promise<
  | { ok: true; receipt: SmsReceiptRow }
  | { ok: false; code: "not_found" | "ambiguous"; error: string }
> {
  let receipts = await findUnmatchedReceiptsByProof(input.method, input.transactionId);
  if (receipts.length === 0) {
    return {
      ok: false,
      code: "not_found",
      error:
        "No matching MoMo payment found yet. Make sure you paid this merchant, then enter the code from your SMS (Airtel: last 6 characters e.g. N80400 · MTN: full 10-digit Financial Transaction ID).",
    };
  }

  const hintAmount = Number(input.amount);
  if (receipts.length > 1 && Number.isFinite(hintAmount) && hintAmount > 0) {
    const byAmount = receipts.filter((r) => amountsMatch(hintAmount, Number(r.amount)));
    if (byAmount.length === 1) {
      return { ok: true, receipt: byAmount[0] };
    }
    if (byAmount.length === 0) {
      return {
        ok: false,
        code: "not_found",
        error: "A payment with that code was found, but the amount does not match. Leave amount blank or use the exact amount you sent.",
      };
    }
    receipts = byAmount;
  }

  if (receipts.length > 1) {
    return {
      ok: false,
      code: "ambiguous",
      error:
        "More than one recent payment matches that code. Enter the exact amount you sent to finish instantly.",
    };
  }

  return { ok: true, receipt: receipts[0] };
}

/** Normalize customer input before storing on a deposit row. */
export function normalizeCustomerProofInput(
  method: MomoGatewayMethod | string,
  raw: string
): string {
  const trimmed = raw.trim();
  if (method === "mtn") {
    return trimmed.replace(/\D/g, "");
  }
  if (method === "airtel") {
    if (trimmed.includes(".")) return extractProofCode(trimmed, "airtel");
    return normalizeTransactionId(trimmed);
  }
  return normalizeTransactionId(trimmed);
}

async function confirmPendingDepositWithSms(
  deposit: WalletDeposit,
  payload: MomoSmsWebhookPayload,
  method: MomoGatewayMethod,
  transactionId: string,
  amount: number
): Promise<MomoWebhookResult> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { ok: false, error: "Database not configured", code: "failed" };
  }

  if (deposit.status === "confirmed") {
    await upsertSmsReceipt(payload, method, transactionId);
    await markReceiptMatched(transactionId, deposit.id);
    return {
      ok: true,
      action: "already_confirmed",
      depositId: deposit.id,
      reference: deposit.reference,
    };
  }

  if (deposit.status !== "pending") {
    return { ok: false, error: "Deposit cannot be matched", code: "failed" };
  }

  const depositTxn = normalizeTransactionId(deposit.transaction_id);
  if (depositTxn && !transactionIdsMatch(depositTxn, transactionId, method)) {
    return {
      ok: false,
      error: "SMS TID does not match the TID already on this deposit",
      code: "ambiguous",
    };
  }

  await supabase
    .from("wallet_deposits")
    .update({
      amount,
      transaction_id: transactionId,
      sender_phone: payload.senderPhone?.trim() || deposit.sender_phone,
      sender_name: payload.senderName?.trim() || deposit.sender_name,
    })
    .eq("id", deposit.id)
    .eq("status", "pending");

  await attachGatewayMetadata(deposit.id, payload, "MATCHED");
  await upsertSmsReceipt(payload, method, transactionId);
  await markReceiptMatched(transactionId, deposit.id);

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

  if (!isTrustedMoMoGatewaySender(payload.sender)) {
    return {
      ok: false,
      error:
        "SMS sender is not a trusted MTN MoMo or Airtel Money channel (personal numbers and forwards are rejected)",
      code: "invalid_payload",
    };
  }

  if (classifyTrustedMoMoSender(payload.sender) !== method) {
    return {
      ok: false,
      error: "SMS sender does not match the claimed payment method",
      code: "invalid_payload",
    };
  }

  // Idempotent: receipt already linked to a confirmed deposit (prevents double credit on app retry).
  const existingReceipt = await getSmsReceiptByTransactionId(transactionId);
  if (existingReceipt?.matched_deposit_id) {
    const supabase = createServiceClient();
    const { data: linked } = supabase
      ? await supabase
          .from("wallet_deposits")
          .select("id, status, reference")
          .eq("id", existingReceipt.matched_deposit_id)
          .maybeSingle()
      : { data: null };

    if (linked?.status === "confirmed") {
      return {
        ok: true,
        action: "already_confirmed",
        depositId: linked.id,
        reference: linked.reference,
      };
    }
  }

  const existingByTxn = await findDepositByTransactionId(transactionId, method);
  if (existingByTxn?.status === "confirmed") {
    await upsertSmsReceipt(payload, method, transactionId);
    await markReceiptMatched(transactionId, existingByTxn.id);
    return {
      ok: true,
      action: "already_confirmed",
      depositId: existingByTxn.id,
      reference: existingByTxn.reference,
    };
  }

  let deposit = existingByTxn?.status === "pending" ? existingByTxn : null;

  if (!deposit) {
    deposit = await findPendingDepositByProof(method, transactionId);
  }

  if (deposit) {
    return confirmPendingDepositWithSms(deposit, payload, method, transactionId, amount);
  }

  const candidates = await findPendingDepositsForMatch(method, amount);
  const scored = candidates
    .map((candidate) => ({
      candidate,
      score: scoreDepositMatch(candidate, payload, method),
    }))
    .filter((entry) => entry.score >= MIN_AUTO_MATCH_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (
        new Date(b.candidate.created_at).getTime() -
        new Date(a.candidate.created_at).getTime()
      );
    });

  if (scored.length === 0) {
    const stored = await upsertSmsReceipt(payload, method, transactionId);
    if (!stored.ok) {
      return { ok: false, error: stored.error, code: "failed", retryable: true };
    }
    return {
      ok: true,
      action: "stored",
      transactionId,
      message: "SMS receipt stored — will confirm when customer submits this TID",
    };
  }

  if (scored.length > 1 && scored[0].score === scored[1].score) {
    const t0 = new Date(scored[0].candidate.created_at).getTime();
    const t1 = new Date(scored[1].candidate.created_at).getTime();
    if (Math.abs(t0 - t1) < 2 * 60 * 1000) {
      await upsertSmsReceipt(payload, method, transactionId);
      return {
        ok: false,
        error: "Multiple pending deposits match — admin must confirm manually",
        code: "ambiguous",
      };
    }
  }

  return confirmPendingDepositWithSms(
    scored[0].candidate,
    payload,
    method,
    transactionId,
    amount
  );
}
