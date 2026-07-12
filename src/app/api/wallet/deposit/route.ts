import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { getRequestCurrency } from "@/lib/request-currency";
import {
  isDepositMethodAllowedForCurrency,
  mobileMoneyUnavailableMessage,
} from "@/lib/deposit-methods";
import { createDepositRequest, getMerchantDetails, merchantDestinationFor } from "@/lib/wallet";
import type { DepositMethod } from "@/types/database";

const validMethods: DepositMethod[] = ["mtn", "airtel", "binance", "usdt_trc20", "other"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const amount = Number(body.amount);
  const method = body.method as DepositMethod;
  const transactionId = (body.transaction_id as string)?.trim();
  const senderPhone = (body.sender_phone as string)?.trim();
  const senderName = (body.sender_name as string)?.trim();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  if (!validMethods.includes(method)) {
    return NextResponse.json({ error: "Select a payment method" }, { status: 400 });
  }

  const currency = await getRequestCurrency();
  if (!isDepositMethodAllowedForCurrency(method, currency)) {
    return NextResponse.json({ error: mobileMoneyUnavailableMessage() }, { status: 400 });
  }

  if (!transactionId) {
    return NextResponse.json({ error: "TID is required" }, { status: 400 });
  }

  const merchants = getMerchantDetails(currency);
  const merchantNumber = merchantDestinationFor(method, merchants);

  if (method !== "other" && method !== "mtn" && !merchantNumber) {
    return NextResponse.json(
      { error: "Merchant number not configured yet. Contact admin." },
      { status: 503 }
    );
  }

  const profile = await getCurrentProfile();

  const deposit = await createDepositRequest({
    userId: user.id,
    amount,
    method,
    transactionId,
    senderPhone: senderPhone || undefined,
    senderName: senderName || undefined,
    userEmail: user.email,
    userName: profile?.full_name ?? undefined,
    currency,
  });

  if (!deposit) {
    return NextResponse.json({ error: "Failed to submit deposit" }, { status: 500 });
  }

  return NextResponse.json({ deposit });
}
