import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserSupportMessages,
  markSupportReadByUser,
  sendUserSupportMessage,
} from "@/lib/support";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await markSupportReadByUser(user.id);
  const messages = await getUserSupportMessages(user.id);
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const text = (body.body as string)?.trim();
  if (!text) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const message = await sendUserSupportMessage(user.id, text);
  if (!message) {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ message });
}
