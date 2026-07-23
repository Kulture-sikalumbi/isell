import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getRequestCurrency } from "@/lib/request-currency";
import { createDepositIntent } from "@/lib/wallet";
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

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  if (!validMethods.includes(method)) {
    return NextResponse.json({ error: "Select a payment method" }, { status: 400 });
  }

  const profile = await getCurrentProfile();
  const currency = await getRequestCurrency();

  const deposit = await createDepositIntent({
    userId: user.id,
    amount,
    method,
    userEmail: user.email,
    userName: profile?.full_name ?? undefined,
    currency,
  });

  if (!deposit) {
    return NextResponse.json({ error: "Failed to create deposit" }, { status: 500 });
  }

  return NextResponse.json({ deposit });
}
