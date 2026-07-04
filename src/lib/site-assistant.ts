import type { Tool } from "@/types/database";
import {
  analyzeToolQuery,
  buildToolRequestReply,
} from "@/lib/assistant-tool-matching";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function prepareGeminiContents(messages: ChatMessage[]) {
  let msgs = [...messages];
  while (msgs.length > 0 && msgs[0].role === "assistant") {
    msgs.shift();
  }

  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const m of msgs) {
    const role = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n${m.content}`;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }

  return contents;
}

const MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
].filter(Boolean) as string[];

export async function callGemini(input: {
  apiKey: string;
  systemPrompt: string;
  messages: ChatMessage[];
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const contents = prepareGeminiContents(input.messages);
  if (contents.length === 0) {
    return { ok: false, error: "No user message" };
  }

  const body = {
    systemInstruction: { parts: [{ text: input.systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.6, maxOutputTokens: 768 },
  };

  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": input.apiKey,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { ok: true, text };
      }

      if (res.status === 429) continue;
      if (res.status === 404) continue;

      console.error(`[gemini ${model}]`, data?.error?.message || data);
    } catch (err) {
      console.error(`[gemini ${model}]`, err);
    }
  }

  return { ok: false, error: "Gemini unavailable" };
}

/** Offline fallback when API fails — still useful for navigation */
export function fallbackAssistantReply(
  userMessage: string,
  tools: Tool[],
  isLoggedIn = false
): string {
  const q = userMessage.toLowerCase();
  const loginReminder = isLoggedIn
    ? ""
    : "\n\n**Sign in required:** [/auth/login](/auth/login)";

  const { shouldOfferRequest, wish } = analyzeToolQuery(userMessage, tools);
  if (shouldOfferRequest) {
    return buildToolRequestReply(wish || userMessage.slice(0, 80), isLoggedIn);
  }

  if (/login|sign in|sign-in|google|account/.test(q)) {
    return "Sign in with Google here: [/auth/login](/auth/login)\n\nOnce signed in you can download tools, pay for activations, and view your dashboard.";
  }

  if (/order|transaction|invoice|history|pending|processing|paid/.test(q)) {
    return `Your orders and invoices are on the dashboard:\n\n• [Order history](/dashboard)\n• [My activations](/dashboard?tab=activations)${loginReminder}`;
  }

  if (/activation|code|licen/.test(q)) {
    return "Completed activation codes appear here: [/dashboard?tab=activations](/dashboard?tab=activations)\n\nIf status is still **Processing**, check [Order history](/dashboard) — we fulfill paid orders shortly.";
  }

  if (/tool|browse|download|unlock|iphone|apple|find/.test(q)) {
    if (tools.length === 0) {
      return "Browse tools at [/tools](/tools) — new tools are added regularly. Sign in with Google to download.";
    }
    const list = tools
      .slice(0, 6)
      .map((t) => `• [${t.name}](/tools/${t.slug})`)
      .join("\n");
    return `Browse all tools: [/tools](/tools)\n\nAvailable now:\n${list}`;
  }

  if (/pay|mobile money|mtn|airtel|binance|imei/.test(q)) {
    return "How to pay:\n1. Open a tool page from [/tools](/tools)\n2. Sign in at [/auth/login](/auth/login)\n3. Enter your IMEI (*#06# on iPhone)\n4. Pay with MTN, Airtel, or Binance at checkout\n\nTrack the order on [/dashboard](/dashboard).";
  }

  if (/home|start|hello|hi|help/.test(q)) {
    return "Hi! I'm here to help with iSell Unlocking.\n\n• [Browse tools](/tools)\n• [Sign in](/auth/login)\n• [My orders](/dashboard)\n• [Activations](/dashboard?tab=activations)\n\nWhat would you like to do?";
  }

  return "I can help you navigate the site:\n\n• [Sign in](/auth/login)\n• [Browse tools](/tools)\n• [Order history](/dashboard)\n• [Activations](/dashboard?tab=activations)\n\nTell me what you're looking for!";
}
