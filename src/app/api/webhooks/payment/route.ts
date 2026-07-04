import { NextResponse } from "next/server";
import { fulfillPayment } from "@/lib/fulfillment";
import { notifyAdminNewOrder } from "@/lib/notifications";
import { recordPaymentLedger } from "@/lib/ledger";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tool } from "@/types/database";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = body.event || body.type;

    if (event === "charge.success" || event === "payment.completed") {
      const reference = body.data?.reference || body.reference;
      if (!reference) {
        return NextResponse.json({ error: "No reference" }, { status: 400 });
      }

      const supabase = createServiceClient();
      if (!supabase) {
        return NextResponse.json({ error: "Database not configured" }, { status: 503 });
      }

      const { data: payment } = await supabase
        .from("payments")
        .select("*, tool:tools(*)")
        .eq("provider_reference", reference)
        .single();

      if (!payment) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      if (payment.status === "completed") {
        return NextResponse.json({ received: true, already_fulfilled: true });
      }

      const tool = payment.tool as Tool | undefined;
      const isManual = !tool || tool.fulfillment_mode !== "direct_api";

      if (isManual) {
        await supabase
          .from("payments")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            fulfillment_status: "awaiting",
          })
          .eq("id", payment.id);

        const { data: updated } = await supabase
          .from("payments")
          .select("*")
          .eq("id", payment.id)
          .single();

        if (updated) await recordPaymentLedger(updated);

        await notifyAdminNewOrder(payment);

        return NextResponse.json({ received: true, awaiting_admin: true });
      }

      await supabase
        .from("payments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      const { data: updatedPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("id", payment.id)
        .single();

      if (updatedPayment) await recordPaymentLedger(updatedPayment);

      const result = await fulfillPayment(payment);

      if (result.success) {
        await supabase
          .from("payments")
          .update({ fulfillment_status: "fulfilled" })
          .eq("id", payment.id);
      }

      return NextResponse.json({
        received: true,
        fulfilled: result.success,
        error: result.error,
      });
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
