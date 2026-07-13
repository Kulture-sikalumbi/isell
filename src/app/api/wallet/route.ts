import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRequestCurrency } from "@/lib/request-currency";
import {
  getMerchantDetails,
  getOrCreateWallet,
  getUserDeposits,
  getWalletTransactions,
} from "@/lib/wallet";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currency = await getRequestCurrency();

  const [wallet, transactions, deposits, merchants] = await Promise.all([
    getOrCreateWallet(user.id, currency),
    getWalletTransactions(user.id),
    getUserDeposits(user.id),
    getMerchantDetails(currency),
  ]);

  return NextResponse.json({
    wallet,
    merchants,
    transactions,
    deposits,
  });
}
