import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getCurrencyRateSettings, saveCurrencyRateSettings } from "@/lib/site-settings";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const settings = await getCurrencyRateSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  let usdToZmwRate: number;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    usdToZmwRate = Number(body.usdToZmwRate);
  } else {
    const formData = await request.formData();
    usdToZmwRate = Number(formData.get("usdToZmwRate"));
  }

  if (!Number.isFinite(usdToZmwRate) || usdToZmwRate <= 0) {
    return NextResponse.json({ error: "Enter a valid USD to ZMW rate" }, { status: 400 });
  }

  const ok = await saveCurrencyRateSettings({ usdToZmwRate, source: "manual" });
  if (!ok) {
    return NextResponse.json({ error: "Failed to save rate" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}