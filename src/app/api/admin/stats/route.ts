import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getCustomerSignupStats } from "@/lib/data";
import { getMerchantAccountingSummary } from "@/lib/ledger";
import { getAdminAttentionCounts } from "@/lib/wallet";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [counts, accounting, signups] = await Promise.all([
    getAdminAttentionCounts(),
    getMerchantAccountingSummary(),
    getCustomerSignupStats(),
  ]);

  return NextResponse.json({
    ...counts,
    merchantBalance: accounting.processedSalesVolume,
    merchantCurrency: accounting.currency,
    platformFees: accounting.platformFeesEarned,
    customerWalletLiability: accounting.customerWalletLiability,
    depositsReceived: accounting.depositsReceivedTotal,
    ledgerTrackedBalance: accounting.balance,
    customersTotal: signups.total,
    customersToday: signups.today,
    customersThisWeek: signups.thisWeek,
    customersThisMonth: signups.thisMonth,
  });
}
