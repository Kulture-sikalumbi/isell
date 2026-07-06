import { NextResponse } from "next/server";
import { getTools } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { buildSiteAssistantContext } from "@/lib/site-assistant-knowledge";
import {
  analyzeToolQuery,
  buildToolMatchReply,
  buildToolRequestReply,
} from "@/lib/assistant-tool-matching";
import { callGemini, fallbackAssistantReply } from "@/lib/site-assistant";
import type { AssistantClientContext } from "@/lib/assistant-storage";
import { getOrCreateWallet, getUserDeposits } from "@/lib/wallet";

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
- Wallet balance: ${ctx.walletBalance ?? "unknown"}
- Pending deposits: ${ctx.pendingDeposits ?? 0}
- Page: ${ctx.currentPath ?? "unknown"}
- Tools in catalog RIGHT NOW (only these exist): ${toolNames}
- Recent user searches: ${ctx.recentSearches.join(", ") || "none"}

## Mandatory rules for this session
- If user is NOT signed in and asks about orders, wallet, checkout, or dashboard → tell them to [sign in with Google](/auth/login) FIRST.
- NEVER invent tool names not in the catalog list above.
- If user wants a tool NOT in the catalog → say it's not available yet, offer to notify admin, tell them to check [/tools](/tools) in a few hours.
- Help with deposits: MTN/Airtel → submit TID → wait for admin → inbox notification when confirmed.
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

    const serverUser = await getCurrentUser();
    const isLoggedIn = clientContext?.isLoggedIn ?? Boolean(serverUser);

    let walletBalance = clientContext?.walletBalance;
    let walletCurrency = clientContext?.walletCurrency;
    let pendingDeposits = clientContext?.pendingDeposits ?? 0;

    if (serverUser && walletBalance === undefined) {
      const wallet = await getOrCreateWallet(serverUser.id);
      walletBalance = wallet ? Number(wallet.balance) : 0;
      walletCurrency = wallet?.currency ?? "ZMW";
      const deposits = await getUserDeposits(serverUser.id);
      pendingDeposits = deposits.filter((d) => d.status === "pending").length;
    }

    const toolAnalysis = analyzeToolQuery(lastQuery, tools);

    if (toolAnalysis.matched) {
      return NextResponse.json({
        reply: buildToolMatchReply(toolAnalysis.matched, isLoggedIn),
        matchedTool: { slug: toolAnalysis.matched.slug, name: toolAnalysis.matched.name },
      });
    }

    if (toolAnalysis.shouldOfferRequest) {
      const toolName = toolAnalysis.wish || lastQuery.slice(0, 80);
      return NextResponse.json({
        reply: buildToolRequestReply(toolName, isLoggedIn),
        suggestToolRequest: { toolName },
        requiresLogin: !isLoggedIn,
      });
    }

    if (
      !isLoggedIn &&
      /order|dashboard|activation|checkout|pay|wallet|deposit|download|my account|invoice|inbox|balance/.test(
        lastQuery
      )
    ) {
      return NextResponse.json({
        reply:
          "You'll need to **sign in first** to access that.\n\n" +
          "1. Go to [/auth/login](/auth/login)\n" +
          "2. Click **Continue with Google**\n" +
          "3. Add wallet funds at [/dashboard?tab=wallet](/dashboard?tab=wallet)\n\n" +
          "Sign-in is required for wallet, orders, and activations.",
        requiresLogin: true,
      });
    }

    const systemPrompt =
      (await buildSiteAssistantContext({
        isLoggedIn,
        walletBalance,
        walletCurrency,
        pendingDeposits,
      })) +
      "\n\n" +
      buildSessionContext({
        isLoggedIn,
        walletBalance,
        walletCurrency,
        pendingDeposits,
        cachedTools: clientContext?.cachedTools ?? [],
        recentSearches: clientContext?.recentSearches ?? [],
        userEmail: clientContext?.userEmail,
        currentPath: clientContext?.currentPath,
      });

    const result = await callGemini({
      apiKey,
      systemPrompt,
      messages,
    });

    if (result.ok) {
      let reply = result.text;
      if (!isLoggedIn && /dashboard|wallet|checkout|pay|order/i.test(reply)) {
        reply +=
          "\n\n**Note:** [Sign in](/auth/login) with Google to use your wallet and view orders.";
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
