import { NextResponse } from "next/server";
import { getTools } from "@/lib/data";
import { buildSiteAssistantContext } from "@/lib/site-assistant-knowledge";
import {
  analyzeToolQuery,
  buildToolRequestReply,
} from "@/lib/assistant-tool-matching";
import { callGemini, fallbackAssistantReply } from "@/lib/site-assistant";
import type { AssistantClientContext } from "@/lib/assistant-storage";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSessionContext(ctx?: AssistantClientContext) {
  if (!ctx) return "";

  const toolNames = ctx.cachedTools.map((t) => t.name).join(", ") || "none loaded";

  return `

## Live session (ground truth — do not contradict)
- User signed in: ${ctx.isLoggedIn ? "YES" : "NO"}
- User email: ${ctx.userEmail ?? "unknown"}
- Page: ${ctx.currentPath ?? "unknown"}
- Tools in catalog RIGHT NOW (only these exist): ${toolNames}
- Recent user searches: ${ctx.recentSearches.join(", ") || "none"}

## Mandatory rules for this session
- If user is NOT signed in and asks about orders, checkout, download, or dashboard → tell them to [sign in with Google](/auth/login) FIRST.
- NEVER invent tool names not in the catalog list above.
- If user wants a tool NOT in the catalog → say it's not available yet, offer to notify admin, tell them to check [/tools](/tools) in a few hours.
- Download and pay require sign-in at [/auth/login](/auth/login).
`.trim();
}

export async function POST(request: Request) {
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
    const clientContext = body.clientContext as AssistantClientContext | undefined;

    if (messages.length === 0 || messages.length > 20) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const tools = await getTools();
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const lastQuery = lastUser?.content ?? "";
    const isLoggedIn = clientContext?.isLoggedIn ?? false;

    const toolAnalysis = analyzeToolQuery(lastQuery, tools);

    if (toolAnalysis.shouldOfferRequest) {
      const toolName =
        toolAnalysis.wish ||
        toolAnalysis.matched?.name ||
        lastQuery.slice(0, 80);
      return NextResponse.json({
        reply: buildToolRequestReply(toolName, isLoggedIn),
        suggestToolRequest: { toolName },
        requiresLogin: !isLoggedIn,
      });
    }

    if (
      !isLoggedIn &&
      /order|dashboard|activation|checkout|pay|download|my account|invoice/i.test(
        lastQuery
      )
    ) {
      return NextResponse.json({
        reply:
          "You'll need to **sign in first** to access that.\n\n" +
          "1. Go to [/auth/login](/auth/login)\n" +
          "2. Click **Continue with Google**\n" +
          "3. Then visit [/dashboard](/dashboard) or [/tools](/tools)\n\n" +
          "Sign-in is required for downloads, payments, and order history.",
        requiresLogin: true,
      });
    }

    const systemPrompt =
      (await buildSiteAssistantContext()) + "\n\n" + buildSessionContext(clientContext);

    const result = await callGemini({
      apiKey,
      systemPrompt,
      messages,
    });

    if (result.ok) {
      let reply = result.text;
      if (!isLoggedIn && /dashboard|download|checkout|pay|order/i.test(reply)) {
        reply +=
          "\n\n**Note:** [Sign in](/auth/login) with Google to download tools or view your orders.";
      }
      return NextResponse.json({ reply, requiresLogin: !isLoggedIn });
    }

    const fallback = fallbackAssistantReply(lastQuery, tools, isLoggedIn);
    return NextResponse.json({ reply: fallback, fallback: true });
  } catch {
    const tools = await getTools();
    return NextResponse.json({
      reply: fallbackAssistantReply("help", tools, false),
      fallback: true,
    });
  }
}
