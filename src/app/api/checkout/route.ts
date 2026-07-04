import { NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getToolBySlug } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { toolId, toolSlug, hardwareId, email, amount } = body;

    if (!toolId || !hardwareId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return NextResponse.json(
        { error: "Payment gateway not configured. Add PAYSTACK_SECRET_KEY to your environment." },
        { status: 503 }
      );
    }

    const tool = toolSlug ? await getToolBySlug(toolSlug) : null;
    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const authClient = await createAuthClient();
    if (!authClient) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
    }

    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to purchase activations" },
        { status: 401 }
      );
    }

    if (user.email && user.email !== email) {
      return NextResponse.json(
        { error: "Email must match your signed-in account" },
        { status: 400 }
      );
    }

    const reference = `isel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const userId = user.id;

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        tool_id: toolId,
        hardware_id: hardwareId,
        amount: amount || tool.retail_price,
        currency: "USD",
        provider: "paystack",
        provider_reference: reference,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round((amount || tool.retail_price) * 100),
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        metadata: {
          payment_id: payment.id,
          tool_id: toolId,
          hardware_id: hardwareId,
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || "Payment initialization failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference,
    });
  } catch {
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
