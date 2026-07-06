import { fulfillPayment } from "@/lib/fulfillment";
import { notifyAdminNewOrder } from "@/lib/notifications";
import { notifyOrderProcessing } from "@/lib/user-notifications";
import { createServiceClient } from "@/lib/supabase/server";
import type { Payment, Tool } from "@/types/database";

export async function completePaidOrder(payment: Payment & { tool?: Tool }) {
  const supabase = createServiceClient();
  if (!supabase || !payment.tool) {
    return { awaiting_admin: false, fulfilled: false, error: "Payment or tool not found" };
  }

  const tool = payment.tool;
  const isManual = tool.fulfillment_mode !== "direct_api";

  if (isManual) {
    await supabase
      .from("payments")
      .update({ fulfillment_status: "awaiting" })
      .eq("id", payment.id);

    await notifyAdminNewOrder(payment);
    if (payment.user_id) {
      await notifyOrderProcessing({
        userId: payment.user_id,
        toolName: tool.name,
      });
    }
    return { awaiting_admin: true, fulfilled: false };
  }

  const result = await fulfillPayment(payment);

  if (result.success) {
    await supabase
      .from("payments")
      .update({ fulfillment_status: "fulfilled" })
      .eq("id", payment.id);
  } else {
    await supabase
      .from("payments")
      .update({ fulfillment_status: "awaiting" })
      .eq("id", payment.id);
    await notifyAdminNewOrder(payment);
  }

  return {
    awaiting_admin: !result.success,
    fulfilled: result.success,
    error: result.error,
  };
}
