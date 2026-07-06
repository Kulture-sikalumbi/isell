import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { submitDepositTransactionId } from "@/lib/wallet";

interface RouteParams {
  params: Promise<{ id: string }>;
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
