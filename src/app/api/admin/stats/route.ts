import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getCustomerSignupStats } from "@/lib/data";
import { getAdminDisplayCurrency } from "@/lib/display-currency-preference";
import { getMerchantAccountingSummary } from "@/lib/ledger";
import { getAdminAttentionCounts } from "@/lib/wallet";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const displayCurrency = await getAdminDisplayCurrency();

  const [counts, accounting, signups] = await Promise.all([
    getAdminAttentionCounts(),
    getMerchantAccountingSummary(displayCurrency),
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
