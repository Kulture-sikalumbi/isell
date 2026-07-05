import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getMerchantDetails,
  getOrCreateWallet,
  getPlatformFee,
  getUserDeposits,
  getWalletTransactions,
} from "@/lib/wallet";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [wallet, transactions, deposits] = await Promise.all([
    getOrCreateWallet(user.id),
    getWalletTransactions(user.id),
    getUserDeposits(user.id),
  ]);

  return NextResponse.json({
    wallet,
    platformFee: getPlatformFee(),
    merchants: getMerchantDetails(),
    transactions,
    deposits,
  });
}
