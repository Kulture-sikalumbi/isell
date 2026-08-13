import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserSupportMessages,
  markSupportReadByUser,
  sendUserSupportMessage,
  uploadSupportChatAudio,
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
  let imageError: string | undefined;
  let audioUrl: string | undefined;
  let audioError: string | undefined;

  // Handle image upload
  if (body.image_data && body.image_content_type) {
    const match = (body.image_data as string).match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      imageError = "Invalid image format. Must be a data URL.";
    } else {
      try {
        const uploaded = await uploadSupportChatImage(user.id, match[2], match[1]);
        if (uploaded) {
          imageUrl = uploaded;
        } else {
          imageError = "Failed to upload image to storage. Please try again.";
        }
      } catch (err) {
        imageError = "Image upload error: " + (err instanceof Error ? err.message : String(err));
      }
    }
  }

  // Handle audio upload
  if (body.audio_data && body.audio_content_type) {
    const match = (body.audio_data as string).match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      audioError = "Invalid audio format. Must be a data URL.";
    } else {
      try {
        const uploaded = await uploadSupportChatAudio(user.id, match[2], match[1]);
        if (uploaded) {
          audioUrl = uploaded;
        } else {
          audioError = "Failed to upload voice note. Please try again.";
        }
      } catch (err) {
        audioError = "Voice note upload error: " + (err instanceof Error ? err.message : String(err));
      }
    }
  }

  // Validate at least one content type present
  if (!text && !imageUrl && !audioUrl && !toolId) {
    const errorMsg = imageError || audioError || "Message content required.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const message = await sendUserSupportMessage(user.id, {
    body: text,
    imageUrl,
    audioUrl,
    toolId,
    replyToId,
  });

  if (!message) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  const warning = (imageError && !imageUrl) ? imageError : (audioError && !audioUrl) ? audioError : undefined;
  return NextResponse.json({ message, ...(warning ? { warning } : {}) });
}
