import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { refundWalletPayment } from "@/lib/wallet";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const note = (body.note as string)?.trim();

  const result = await refundWalletPayment(id, note);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...result });
}
