import { NextResponse } from "next/server";
import { isMtnCallbackAuthorized } from "@/lib/mtn-momo";
import {
  confirmDepositFromProvider,
  updateDepositProviderStatus,
} from "@/lib/wallet";
import { createServiceClient } from "@/lib/supabase/server";

function mapProviderState(payload: Record<string, unknown>) {
  return String(payload.status ?? payload.financialTransactionStatus ?? "UNKNOWN").toUpperCase();
}

export async function POST(request: Request) {
  if (!isMtnCallbackAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized callback" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const referenceId = String(
    payload.referenceId ?? payload.externalId ?? payload.financialTransactionId ?? ""
  ).trim();
  if (!referenceId) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { data: deposit } = await supabase
    .from("wallet_deposits")
    .select("*")
    .or(`provider_reference.eq.${referenceId},reference.eq.${referenceId}`)
    .eq("provider", "mtn_momo")
    .maybeSingle();

  if (!deposit) {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  const state = mapProviderState(payload);
  await updateDepositProviderStatus({
    depositId: deposit.id,
    providerStatus: state,
    providerPayload: payload,
  });

  if (state === "SUCCESSFUL") {
    const result = await confirmDepositFromProvider(
      deposit.id,
      `Auto-confirmed from MTN callback (${referenceId})`
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true, referenceId, state });
}
