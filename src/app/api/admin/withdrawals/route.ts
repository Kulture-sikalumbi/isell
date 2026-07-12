import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getPendingWithdrawals } from "@/lib/withdrawals";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const withdrawals = await getPendingWithdrawals();
  return NextResponse.json({ withdrawals });
}
