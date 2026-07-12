import { NextResponse } from "next/server";
import { completePaidOrder } from "@/lib/complete-order";
import { getToolBySlug } from "@/lib/data";
import { getCheckoutTotal } from "@/lib/platform-fee";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getRequestCurrency } from "@/lib/request-currency";
import { getWalletBalance, purchaseWithWallet } from "@/lib/wallet";
import { convertCurrency } from "@/lib/format-currency";
import { getUsdToZmwRate } from "@/lib/currency-rates";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { toolId, toolSlug, hardwareId, email } = body;

    if (!toolId || !hardwareId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    const currency = await getRequestCurrency();
    const fxRate = currency === "ZMW" ? await getUsdToZmwRate() : undefined;
    const totalCost = convertCurrency(getCheckoutTotal(tool), "USD", currency, fxRate);
    const balance = await getWalletBalance(user.id, currency);

    if (balance < totalCost) {
      return NextResponse.json(
        {
          error: "Insufficient wallet balance",
          required: totalCost,
          balance,
        },
        { status: 402 }
      );
    }

    const result = await purchaseWithWallet({
      userId: user.id,
      tool,
      hardwareId: hardwareId.trim(),
      currency,
    });

    if (!result.ok || !result.payment_id) {
      return NextResponse.json(
        { error: result.error || "Purchase failed" },
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
      .eq("id", result.payment_id)
      .single();

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 500 });
    }

    const orderResult = await completePaidOrder(payment);

    return NextResponse.json({
      success: true,
      paymentId: result.payment_id,
      reference: result.reference,
      balance: result.balance,
      awaitingAdmin: orderResult.awaiting_admin,
      fulfilled: orderResult.fulfilled,
      redirectUrl: `/dashboard?tab=activations&wait=${result.payment_id}`,
    });
  } catch {
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
