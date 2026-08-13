import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserSupportMessages,
  markSupportReadByUser,
  sendUserSupportMessage,
  uploadSupportChatImage,
} from "@/lib/support";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await markSupportReadByUser(user.id);
  const messages = await getUserSupportMessages(user.id);
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const text = typeof body.body === "string" ? body.body.trim() : undefined;
  const replyToId = typeof body.reply_to_id === "string" ? body.reply_to_id : undefined;
  const toolId = typeof body.tool_id === "string" ? body.tool_id : undefined;

  let imageUrl: string | undefined;
  if (body.image_data && body.image_content_type) {
    const match = (body.image_data as string).match(/^data:(.+);base64,(.+)$/);
    if (match) {
      const uploaded = await uploadSupportChatImage(user.id, match[2], match[1]);
      if (uploaded) imageUrl = uploaded;
    }
  }

  if (!text && !imageUrl && !toolId) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }

  const message = await sendUserSupportMessage(user.id, {
    body: text,
    imageUrl,
    toolId,
    replyToId,
  });

  if (!message) return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  return NextResponse.json({ message });
}
