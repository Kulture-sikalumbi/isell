import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getPaymentMethodForUser } from "@/lib/payment-methods";
import { getRequestCurrency } from "@/lib/request-currency";
import {
  isDepositMethodAllowedForCurrency,
  mobileMoneyUnavailableMessage,
} from "@/lib/deposit-methods";
import { getOrCreateWallet } from "@/lib/wallet";
import { createWithdrawalRequest, getUserWithdrawals } from "@/lib/withdrawals";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const withdrawals = await getUserWithdrawals(user.id);
  return NextResponse.json({ withdrawals });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getCurrentProfile();
  const body = await request.json();
  const amount = Number(body.amount);
  const paymentMethodId = (body.payment_method_id ?? body.paymentMethodId) as string;
  const policyAccepted = Boolean(body.policy_accepted ?? body.policyAccepted);

  if (!paymentMethodId) {
    return NextResponse.json({ error: "Select a payout method" }, { status: 400 });
  }

  const paymentMethod = await getPaymentMethodForUser(user.id, paymentMethodId);
  if (!paymentMethod) {
    return NextResponse.json({ error: "Payout method not found" }, { status: 404 });
  }

  const currency = await getRequestCurrency();

  if (!isDepositMethodAllowedForCurrency(paymentMethod.method, currency)) {
    return NextResponse.json({ error: mobileMoneyUnavailableMessage() }, { status: 400 });
  }

  await getOrCreateWallet(user.id, currency);

  const result = await createWithdrawalRequest({
    userId: user.id,
    amount,
    currency,
    paymentMethod,
    policyAccepted,
    userEmail: user.email,
    userName: profile?.full_name ?? undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ withdrawal: result.withdrawal });
}
