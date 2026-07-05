import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { buildAdminAssistantContext } from "@/lib/admin-assistant-knowledge";
import { callGemini, fallbackAdminReply } from "@/lib/site-assistant";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Assistant is not configured yet" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const messages = (body.messages as ChatMessage[]) ?? [];

    if (messages.length === 0 || messages.length > 20) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const lastQuery = lastUser?.content ?? "";

    const systemPrompt = await buildAdminAssistantContext();

    const result = await callGemini({
      apiKey,
      systemPrompt,
      messages,
    });

    if (result.ok) {
      return NextResponse.json({ reply: result.text });
    }

    return NextResponse.json({
      reply: fallbackAdminReply(lastQuery),
      fallback: true,
    });
  } catch {
    return NextResponse.json({
      reply: fallbackAdminReply("help"),
      fallback: true,
    });
  }
}
