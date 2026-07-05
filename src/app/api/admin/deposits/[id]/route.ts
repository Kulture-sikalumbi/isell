import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { confirmDeposit, rejectDeposit } from "@/lib/wallet";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const action = body.action as "confirm" | "reject";
  const note = (body.note as string)?.trim();

  if (action === "confirm") {
    const result = await confirmDeposit(id, note);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "reject") {
    const result = await rejectDeposit(id, note);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
