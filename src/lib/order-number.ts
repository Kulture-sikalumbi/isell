import type { Payment } from "@/types/database";

/** Display order number — prefers human-friendly order_number. */
export function formatOrderNumber(
  payment: Pick<Payment, "order_number" | "provider_reference" | "id">
): string {
  if (payment.order_number) return payment.order_number;
  if (payment.provider_reference) return payment.provider_reference;
  return payment.id.slice(0, 8).toUpperCase();
}

export function canRejectOrder(payment: Payment): boolean {
  return payment.status === "completed" && payment.provider === "wallet";
}
