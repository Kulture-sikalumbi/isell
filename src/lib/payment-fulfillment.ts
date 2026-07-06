import type { Payment } from "@/types/database";

export type AdminPaymentRow = Payment & {
  activation?: { id: string } | { id: string }[] | null;
  profile?: { email: string; full_name: string | null } | null;
};

function hasActivation(payment: AdminPaymentRow): boolean {
  const a = payment.activation;
  if (!a) return false;
  if (Array.isArray(a)) return a.length > 0;
  return Boolean(a.id);
}

export function paymentNeedsFulfillment(payment: AdminPaymentRow): boolean {
  if (payment.status !== "completed") return false;
  if (payment.fulfillment_status === "fulfilled") return false;
  if (hasActivation(payment)) return false;
  return true;
}

export function adminPaymentStatus(payment: AdminPaymentRow): {
  label: string;
  variant: "success" | "warning" | "danger" | "default" | "info";
} {
  if (payment.status === "pending") return { label: "Pending payment", variant: "warning" };
  if (payment.status === "failed") return { label: "Failed", variant: "danger" };
  if (payment.status === "refunded") return { label: "Refunded", variant: "default" };

  if (paymentNeedsFulfillment(payment)) {
    return { label: "Needs activation key", variant: "warning" };
  }

  if (payment.fulfillment_status === "fulfilled" || hasActivation(payment)) {
    return { label: "Key delivered", variant: "success" };
  }

  return { label: "Completed", variant: "success" };
}

export function sortPaymentsForAdmin<T extends AdminPaymentRow>(payments: T[]): T[] {
  return [...payments].sort((a, b) => {
    const aNeeds = paymentNeedsFulfillment(a) ? 1 : 0;
    const bNeeds = paymentNeedsFulfillment(b) ? 1 : 0;
    if (aNeeds !== bNeeds) return bNeeds - aNeeds;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
