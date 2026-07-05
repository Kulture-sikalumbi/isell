import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getPendingDeposits } from "@/lib/wallet";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const deposits = await getPendingDeposits();
  return NextResponse.json({ deposits });
}
