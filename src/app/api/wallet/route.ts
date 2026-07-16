import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRequestCurrency } from "@/lib/request-currency";
import {
  getMerchantDetails,
  getUserDeposits,
  getWalletDisplaySnapshot,
  getWalletTransactions,
} from "@/lib/wallet";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currency = await getRequestCurrency();

  const [snapshot, transactions, deposits, merchants] = await Promise.all([
    getWalletDisplaySnapshot(user.id, currency),
    getWalletTransactions(user.id),
    getUserDeposits(user.id),
    getMerchantDetails(currency),
  ]);

  return NextResponse.json({
    wallet: snapshot.wallet
      ? {
          ...snapshot.wallet,
          // Keep raw ledger values on wallet; expose converted display fields separately.
          balance: snapshot.nativeBalance,
          currency: snapshot.nativeCurrency,
        }
      : null,
    displayBalance: snapshot.displayBalance,
    displayCurrency: snapshot.displayCurrency,
    nativeBalance: snapshot.nativeBalance,
    nativeCurrency: snapshot.nativeCurrency,
    fxRate: snapshot.fxRate,
    merchants,
    transactions,
    deposits,
  });
}
