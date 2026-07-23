import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getAdminDisplayCurrency } from "@/lib/display-currency-preference";
import { recordMerchantReconciliation } from "@/lib/ledger";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const actualMerchantBalance = Number(body.actual_merchant_balance);
  const note = (body.note as string)?.trim();
  const currency = await getAdminDisplayCurrency();

  const result = await recordMerchantReconciliation({
    actualMerchantBalance,
    note,
    currency,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
