import { NextResponse } from "next/server";
import { completePaidOrder } from "@/lib/complete-order";
import { getToolBySlug } from "@/lib/data";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getRequestCurrency } from "@/lib/request-currency";
import { getToolCheckoutTotalInCurrency } from "@/lib/tool-pricing";
import {
  collectCheckoutValues,
  resolveToolFormFields,
} from "@/lib/tool-form-fields";
import { getWalletBalance, purchaseWithWallet } from "@/lib/wallet";
import { getUsdToZmwRate } from "@/lib/currency-rates";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { toolId, toolSlug, email } = body;
    const fieldValues =
      body.fieldValues && typeof body.fieldValues === "object"
        ? (body.fieldValues as Record<string, string>)
        : undefined;
    // Back-compat: older clients sent a single hardwareId
    const legacyHardwareId =
      typeof body.hardwareId === "string" ? body.hardwareId.trim() : "";

    if (!toolId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const tool = toolSlug ? await getToolBySlug(toolSlug) : null;
    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const formFields = resolveToolFormFields(tool);
    const collected = fieldValues
      ? collectCheckoutValues(formFields, fieldValues)
      : legacyHardwareId
        ? {
            ok: true as const,
            primaryValue: legacyHardwareId,
            checkoutFields: [
              {
                id: formFields[0]?.id ?? "primary",
                label: formFields[0]?.label ?? tool.identifier_label ?? "ID",
                value: legacyHardwareId,
              },
            ],
          }
        : { ok: false as const, error: "Missing required fields" };

    if (!collected.ok) {
      return NextResponse.json({ error: collected.error }, { status: 400 });
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
        { error: "You must be signed in to purchase" },
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
    const fxRate = await getUsdToZmwRate();
    const totalCost = getToolCheckoutTotalInCurrency(tool, currency, fxRate);
    const displayBalance = await getWalletBalance(user.id, currency);

    if (displayBalance < totalCost) {
      return NextResponse.json(
        {
          error: "Insufficient wallet balance",
          required: totalCost,
          balance: displayBalance,
        },
        { status: 402 }
      );
    }

    const result = await purchaseWithWallet({
      userId: user.id,
      tool,
      hardwareId: collected.primaryValue,
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

    if (collected.checkoutFields.length > 0) {
      await supabase
        .from("payments")
        .update({ checkout_fields: collected.checkoutFields })
        .eq("id", result.payment_id);
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
