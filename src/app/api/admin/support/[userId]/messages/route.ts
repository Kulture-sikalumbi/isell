import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import {
  getUserSupportMessages,
  markSupportReadByAdmin,
  sendAdminSupportMessage,
  uploadSupportChatImage,
} from "@/lib/support";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { userId } = await params;
  await markSupportReadByAdmin(userId);
  const messages = await getUserSupportMessages(userId);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { userId } = await params;
  const body = await request.json();
  const text = typeof body.body === "string" ? body.body.trim() : undefined;
  const replyToId = typeof body.reply_to_id === "string" ? body.reply_to_id : undefined;
  const toolId = typeof body.tool_id === "string" ? body.tool_id : undefined;

  let imageUrl: string | undefined;
  if (body.image_data && body.image_content_type) {
    const match = (body.image_data as string).match(/^data:(.+);base64,(.+)$/);
    if (match) {
      const uploaded = await uploadSupportChatImage(userId, match[2], match[1]);
      if (uploaded) imageUrl = uploaded;
    }
  }

  if (!text && !imageUrl && !toolId) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }

  const message = await sendAdminSupportMessage(userId, {
    body: text,
    imageUrl,
    toolId,
    replyToId,
  });

  if (!message) return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  return NextResponse.json({ message });
}
