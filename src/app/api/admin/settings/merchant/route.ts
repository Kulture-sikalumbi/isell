import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import {
  getMerchantDepositSettings,
  saveMerchantDepositSettings,
} from "@/lib/site-settings";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const settings = await getMerchantDepositSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();

  const ok = await saveMerchantDepositSettings({
    mtn: String(body.mtn ?? ""),
    airtel: String(body.airtel ?? ""),
    binancePayId: String(body.binancePayId ?? ""),
    usdtTrc20Address: String(body.usdtTrc20Address ?? ""),
  });

  if (!ok) {
    return NextResponse.json({ error: "Failed to save deposit accounts" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
