import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("*, tool:tools(*)")
    .eq("id", id)
    .single();

  if (!payment || payment.user_id !== user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: activation } = await supabase
    .from("activations")
    .select("*, tool:tools(*)")
    .eq("payment_id", id)
    .maybeSingle();

  return NextResponse.json({
    paymentId: payment.id,
    toolName: payment.tool?.name ?? "Tool",
    hardwareId: payment.hardware_id,
    fulfillmentStatus: payment.fulfillment_status,
    awaitingAdmin: payment.fulfillment_status === "awaiting",
    fulfilled: payment.fulfillment_status === "fulfilled",
    activation: activation ?? null,
  });
}
