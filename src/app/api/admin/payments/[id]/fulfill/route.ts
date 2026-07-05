import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyActivationReady } from "@/lib/user-notifications";
import type { Tool } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const activationCode = (body.activation_code as string)?.trim();
  const whitelistOnly = Boolean(body.whitelist_only);

  if (!activationCode && !whitelistOnly) {
    return NextResponse.json(
      { error: "Enter an activation code or mark as device registered" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("*, tool:tools(*)")
    .eq("id", id)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status !== "completed") {
    return NextResponse.json({ error: "Payment is not completed yet" }, { status: 400 });
  }

  if (payment.fulfillment_status === "fulfilled") {
    return NextResponse.json({ error: "Already fulfilled" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("activations")
    .select("id")
    .eq("payment_id", id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Activation already exists" }, { status: 400 });
  }

  const code = whitelistOnly ? "DEVICE_REGISTERED" : activationCode!;

  const { error: activationError } = await supabase.from("activations").insert({
    user_id: payment.user_id,
    payment_id: payment.id,
    tool_id: payment.tool_id,
    hardware_id: payment.hardware_id,
    activation_code: code,
  });

  if (activationError) {
    return NextResponse.json({ error: activationError.message }, { status: 500 });
  }

  await supabase
    .from("payments")
    .update({ fulfillment_status: "fulfilled" })
    .eq("id", id);

  const toolName = (payment.tool as Tool | null)?.name ?? "your tool";
  if (payment.user_id) {
    await notifyActivationReady({
      userId: payment.user_id,
      toolName,
      hardwareId: payment.hardware_id,
      paymentId: id,
    });
  }

  return NextResponse.json({ success: true });
}
