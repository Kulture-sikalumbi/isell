import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getAdminSettings, updateAdminSetting } from "@/lib/admin-settings";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const settings = await getAdminSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await request.json();
  const key = body.key as string | undefined;
  const value = body.value as string | null | undefined;

  if (!key) {
    return NextResponse.json({ error: "Key required" }, { status: 400 });
  }

  const ok = await updateAdminSetting(key, value ?? null);
  if (!ok) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  const settings = await getAdminSettings();
  return NextResponse.json({ settings });
}
