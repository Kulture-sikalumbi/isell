import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getMerchantAccountingSummary } from "@/lib/ledger";
import { getAdminAttentionCounts } from "@/lib/wallet";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [counts, accounting] = await Promise.all([
    getAdminAttentionCounts(),
    getMerchantAccountingSummary(),
  ]);

  return NextResponse.json({
    ...counts,
    merchantBalance: accounting.processedSalesVolume,
    merchantCurrency: accounting.currency,
    platformFees: accounting.platformFeesEarned,
    customerWalletLiability: accounting.customerWalletLiability,
    depositsReceived: accounting.depositsReceivedTotal,
    ledgerTrackedBalance: accounting.balance,
  });
}
