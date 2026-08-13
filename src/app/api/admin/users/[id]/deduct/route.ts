import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { deductUserWalletByAdmin } from "@/lib/admin-wallet-deduct";

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
  const amount = Number(body.amount);
  const currency = typeof body.currency === "string" ? body.currency : "";
  const note = typeof body.note === "string" ? body.note : null;

  const result = await deductUserWalletByAdmin({
    userId: id,
    amount,
    currency,
    adminNote: note,
    adminEmail: admin.email ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
