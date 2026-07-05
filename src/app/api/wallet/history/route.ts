import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { mergeWalletTransactionsForCustomer } from "@/lib/storefront-tool";
import {
  getPendingWalletDeposits,
  getRejectedWalletDeposits,
  getWalletTransactionsPage,
} from "@/lib/wallet";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before");
  const limit = Math.min(Number(searchParams.get("limit") ?? 15), 50);

  const [{ transactions, nextCursor }, pendingDeposits, rejectedDeposits] = await Promise.all([
    getWalletTransactionsPage(user.id, { limit, before }),
    before ? Promise.resolve([]) : getPendingWalletDeposits(user.id),
    before ? Promise.resolve([]) : getRejectedWalletDeposits(user.id),
  ]);

  return NextResponse.json({
    pendingDeposits,
    rejectedDeposits,
    transactions: mergeWalletTransactionsForCustomer(transactions),
    nextCursor,
  });
}
