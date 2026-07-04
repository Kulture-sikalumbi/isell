import { createServiceClient } from "@/lib/supabase/server";
import { sendAdminOrderEmail } from "@/lib/email";
import type { Payment, Tool } from "@/types/database";

export async function notifyAdminNewOrder(payment: Payment & { tool?: Tool }) {
  const supabase = createServiceClient();
  if (!supabase || !payment.tool) return;

  const tool = payment.tool;
  const title = `New order: ${tool.name}`;
  const message = `IMEI/ID ${payment.hardware_id} — ${payment.amount} ${payment.currency}. Reference: ${payment.provider_reference ?? payment.id}`;

  await supabase.from("admin_notifications").insert({
    type: "new_order",
    title,
    message,
    payment_id: payment.id,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await sendAdminOrderEmail({
    toolName: tool.name,
    hardwareId: payment.hardware_id,
    amount: `${payment.currency} ${payment.amount}`,
    reference: payment.provider_reference ?? payment.id,
    appUrl,
  });
}
