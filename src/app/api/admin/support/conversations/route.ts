import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { getSupportConversations } from "@/lib/support";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const conversations = await getSupportConversations();
  return NextResponse.json({ conversations });
}
