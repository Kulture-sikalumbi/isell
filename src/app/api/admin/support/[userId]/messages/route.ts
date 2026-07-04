import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import {
  getUserSupportMessages,
  markSupportReadByAdmin,
  sendAdminSupportMessage,
} from "@/lib/support";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  await markSupportReadByAdmin(userId);
  const messages = await getUserSupportMessages(userId);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json();
  const text = (body.body as string)?.trim();
  if (!text) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const message = await sendAdminSupportMessage(userId, text);
  if (!message) {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ message });
}
