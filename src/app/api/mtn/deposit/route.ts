import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { initiateMtnRequestToPay } from "@/lib/mtn-momo";
import { createDepositIntent, setDepositProviderReference } from "@/lib/wallet";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const amount = Number(body.amount);
  const phoneNumber = String(body.phone_number ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }
  if (!phoneNumber) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const deposit = await createDepositIntent({
    userId: user.id,
    amount,
    method: "mtn",
    userEmail: user.email,
  });
  if (!deposit) {
    return NextResponse.json({ error: "Failed to create deposit intent" }, { status: 500 });
  }

  try {
    const payment = await initiateMtnRequestToPay({
      amount,
      currency: deposit.currency,
      phoneNumber,
      externalId: deposit.reference,
      payerMessage: "iSell Unlocks wallet top-up",
      payeeNote: `Deposit ${deposit.reference}`,
    });

    const saved = await setDepositProviderReference({
      depositId: deposit.id,
      provider: "mtn_momo",
      providerReference: payment.referenceId,
      providerStatus: "PENDING",
      providerPayload: { phoneNumber },
    });
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 500 });
    }

    return NextResponse.json({
      deposit: saved.deposit,
      status: "pending",
      message: "Payment prompt sent to your phone. Approve the MoMo request to continue.",
    });
  } catch (error) {
    await setDepositProviderReference({
      depositId: deposit.id,
      provider: "mtn_momo",
      providerStatus: "FAILED",
      providerPayload: {
        error: error instanceof Error ? error.message : "Unknown MTN error",
      },
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to start MTN payment. Please try again.",
      },
      { status: 502 }
    );
  }
}
