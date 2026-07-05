import { createServiceClient } from "@/lib/supabase/server";
import { alertAdminNewOrder } from "@/lib/admin-alerts";
import { sendAdminOrderEmail } from "@/lib/email";
import { formatSiteCurrency, resolveDisplayCurrency } from "@/lib/currency";
import type { Payment, Tool } from "@/types/database";

export async function notifyAdminNewOrder(payment: Payment & { tool?: Tool }) {
  const supabase = createServiceClient();
  if (!supabase || !payment.tool) return;

  const tool = payment.tool;
  const currency = resolveDisplayCurrency(payment.currency);
  const amountLabel = formatSiteCurrency(Number(payment.amount), currency);
  const title = `New order: ${tool.name}`;
  const message = `${payment.tool.identifier_label ?? "ID"} ${payment.hardware_id} — ${amountLabel}. Reference: ${payment.provider_reference ?? payment.id}`;

  await supabase.from("admin_notifications").insert({
    type: "new_order",
    title,
    message,
    payment_id: payment.id,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  await Promise.all([
    sendAdminOrderEmail({
      toolName: tool.name,
      hardwareId: payment.hardware_id,
      amount: amountLabel,
      reference: payment.provider_reference ?? payment.id,
      appUrl,
    }),
    alertAdminNewOrder({
      toolName: tool.name,
      hardwareId: payment.hardware_id,
      amount: Number(payment.amount),
      currency,
      reference: payment.provider_reference ?? payment.id,
      appUrl,
    }),
  ]);
}
