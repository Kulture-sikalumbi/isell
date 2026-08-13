import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { clearChatForAll } from "@/lib/support";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { userId } = await params;
  const ok = await clearChatForAll(userId);
  return ok
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: "Failed" }, { status: 500 });
}
