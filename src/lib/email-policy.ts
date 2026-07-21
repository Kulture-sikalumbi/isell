import { runtimeEnv } from "@/lib/runtime-env";

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = runtimeEnv(name);
  if (raw == null || raw === "") return defaultValue;
  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return defaultValue;
}

/**
 * Resend free tier is small (~3k/month). Defaults keep email for final customer
 * outcomes only; admin alerts use the in-app inbox instead.
 *
 * Set any flag to "true" in Azure to re-enable that email type.
 */
export function shouldSendCustomerWelcomeEmail(): boolean {
  return envFlag("EMAIL_SEND_WELCOME", false);
}

/** "Order received" — skip by default; activation-ready email is the real one. */
export function shouldSendCustomerOrderProcessingEmail(): boolean {
  return envFlag("EMAIL_SEND_ORDER_PROCESSING", false);
}

/**
 * Final wallet credit for crypto / manual deposits — keep on by default.
 * MTN / Airtel never send deposit emails (see notifyDepositConfirmed).
 */
export function shouldSendCustomerDepositConfirmedEmail(): boolean {
  return envFlag("EMAIL_SEND_DEPOSIT_CONFIRMED", true);
}

/** Activation key delivery — keep on by default. */
export function shouldSendCustomerActivationReadyEmail(): boolean {
  return envFlag("EMAIL_SEND_ACTIVATION_READY", true);
}

/** Refund / rejection — keep on by default. */
export function shouldSendCustomerOrderRejectedEmail(): boolean {
  return envFlag("EMAIL_SEND_ORDER_REJECTED", true);
}

/** Pending deposits, orders, withdrawals, chat, tool requests — inbox only by default. */
export function shouldSendAdminAlertEmails(): boolean {
  return envFlag("EMAIL_SEND_ADMIN_ALERTS", false);
}
