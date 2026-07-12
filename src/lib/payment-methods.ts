import { createServiceClient } from "@/lib/supabase/server";
import type { DepositMethod, UserPaymentMethod } from "@/types/database";

export type PaymentMethodInput = {
  method: UserPaymentMethod["method"];
  accountIdentifier: string;
  accountName?: string;
  label?: string;
  isDefault?: boolean;
};

function normalizeMethod(method: string): UserPaymentMethod["method"] | null {
  const m = method.trim().toLowerCase();
  if (m === "mtn" || m === "airtel" || m === "binance" || m === "usdt_trc20") {
    return m;
  }
  return null;
}

export async function getUserPaymentMethods(userId: string): Promise<UserPaymentMethod[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("user_payment_methods")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (data ?? []) as UserPaymentMethod[];
}

export async function getPaymentMethodForUser(
  userId: string,
  methodId: string
): Promise<UserPaymentMethod | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("user_payment_methods")
    .select("*")
    .eq("id", methodId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as UserPaymentMethod) ?? null;
}

export async function getDefaultPaymentMethodForDeposit(
  userId: string,
  method: DepositMethod
): Promise<UserPaymentMethod | null> {
  if (method === "other") return null;

  const methods = await getUserPaymentMethods(userId);
  const matching = methods.filter((m) => m.method === method);
  if (matching.length === 0) return null;
  return matching.find((m) => m.is_default) ?? matching[0];
}

async function clearDefaultForUser(userId: string) {
  const supabase = createServiceClient();
  if (!supabase) return;

  await supabase
    .from("user_payment_methods")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_default", true);
}

export async function createUserPaymentMethod(
  userId: string,
  input: PaymentMethodInput
): Promise<{ ok: true; method: UserPaymentMethod } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const method = normalizeMethod(input.method);
  if (!method) return { ok: false, error: "Invalid payment method" };

  const accountIdentifier = input.accountIdentifier.trim();
  if (!accountIdentifier) return { ok: false, error: "Account details are required" };

  const accountName = input.accountName?.trim() || null;
  const label = input.label?.trim() || null;
  const isDefault = Boolean(input.isDefault);

  if (isDefault) {
    await clearDefaultForUser(userId);
  }

  const existing = await getUserPaymentMethods(userId);
  const shouldBeDefault = isDefault || existing.length === 0;

  if (shouldBeDefault && !isDefault) {
    await clearDefaultForUser(userId);
  }

  const { data, error } = await supabase
    .from("user_payment_methods")
    .insert({
      user_id: userId,
      method,
      account_identifier: accountIdentifier,
      account_name: accountName,
      label,
      is_default: shouldBeDefault,
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to save payment method" };
  }

  return { ok: true, method: data as UserPaymentMethod };
}

export async function updateUserPaymentMethod(
  userId: string,
  methodId: string,
  input: Partial<PaymentMethodInput>
): Promise<{ ok: true; method: UserPaymentMethod } | { ok: false; error: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const existing = await getPaymentMethodForUser(userId, methodId);
  if (!existing) return { ok: false, error: "Payment method not found" };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.method !== undefined) {
    const method = normalizeMethod(input.method);
    if (!method) return { ok: false, error: "Invalid payment method" };
    updates.method = method;
  }

  if (input.accountIdentifier !== undefined) {
    const trimmed = input.accountIdentifier.trim();
    if (!trimmed) return { ok: false, error: "Account details are required" };
    updates.account_identifier = trimmed;
  }

  if (input.accountName !== undefined) {
    updates.account_name = input.accountName.trim() || null;
  }

  if (input.label !== undefined) {
    updates.label = input.label.trim() || null;
  }

  if (input.isDefault === true) {
    await clearDefaultForUser(userId);
    updates.is_default = true;
  } else if (input.isDefault === false && existing.is_default) {
    updates.is_default = false;
  }

  const { data, error } = await supabase
    .from("user_payment_methods")
    .update(updates)
    .eq("id", methodId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to update payment method" };
  }

  return { ok: true, method: data as UserPaymentMethod };
}

export async function deleteUserPaymentMethod(
  userId: string,
  methodId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, error: "Database not configured" };

  const { error } = await supabase
    .from("user_payment_methods")
    .delete()
    .eq("id", methodId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function paymentMethodSnapshot(method: UserPaymentMethod) {
  return {
    method: method.method,
    label: method.label,
    account_identifier: method.account_identifier,
    account_name: method.account_name,
  };
}
