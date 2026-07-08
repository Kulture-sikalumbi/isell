import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { queryMtnPaymentStatus } from "@/lib/mtn-momo";
import { submitDepositTransactionId } from "@/lib/wallet";
import {
  confirmDepositFromProvider,
  getDepositByIdForUser,
  updateDepositProviderStatus,
} from "@/lib/wallet";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deposit = await getDepositByIdForUser(id, user.id);
  if (!deposit) {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  if (deposit.provider !== "mtn_momo" || !deposit.provider_reference) {
    return NextResponse.json({ deposit });
  }

  if (deposit.status === "confirmed" || deposit.status === "rejected") {
    return NextResponse.json({ deposit });
  }

  try {
    const status = await queryMtnPaymentStatus(deposit.provider_reference);
    const updated = await updateDepositProviderStatus({
      depositId: deposit.id,
      providerStatus: status.state,
      providerPayload: status.raw,
    });
    if (!updated.ok) {
      return NextResponse.json({ error: updated.error }, { status: 500 });
    }

    let current = updated.deposit;
    if (status.state === "SUCCESSFUL") {
      const result = await confirmDepositFromProvider(
        deposit.id,
        `Auto-confirmed from MTN status (${deposit.provider_reference})`
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      const refreshed = await getDepositByIdForUser(id, user.id);
      if (refreshed) current = refreshed;
    }

    return NextResponse.json({ deposit: current, provider_state: status.state });
  } catch (error) {
    return NextResponse.json(
      {
        deposit,
        provider_state: deposit.provider_status ?? "UNKNOWN",
        error: error instanceof Error ? error.message : "Failed to fetch provider status",
      },
      { status: 200 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const transactionId = (body.transaction_id as string)?.trim();
  const senderPhone = (body.sender_phone as string)?.trim();
  const senderName = (body.sender_name as string)?.trim();

  if (!transactionId) {
    return NextResponse.json({ error: "TID is required" }, { status: 400 });
  }

  const profile = await getCurrentProfile();

  const result = await submitDepositTransactionId(id, user.id, {
    transactionId,
    senderPhone: senderPhone || undefined,
    senderName: senderName || undefined,
    userEmail: user.email,
    userName: profile?.full_name ?? undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
