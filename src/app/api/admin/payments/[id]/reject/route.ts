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

  if (!note || note.length < 3) {
    return NextResponse.json(
      { error: "A rejection reason is required (at least 3 characters)." },
      { status: 400 }
    );
  }

  if (note.length > 500) {
    return NextResponse.json(
      { error: "Rejection reason must be 500 characters or less." },
      { status: 400 }
    );
  }

  const result = await refundWalletPayment(id, note);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...result });
}
