import type { Tool } from "@/types/database";
import { formatSiteCurrency, getSiteCurrency, getPlatformFeeAmount } from "@/lib/currency";

const STOP_WORDS = new Set([
  "a", "an", "the", "for", "to", "my", "me", "i", "need", "want", "get", "find",
  "looking", "have", "do", "you", "is", "are", "any", "tool", "unlock", "unlocking",
  "device", "phone", "please", "can", "could", "would", "how", "what", "where",
]);

const TOOL_SEARCH_PATTERNS = [
  /(?:looking for|need|want|find|searching for|do you have|got any|where is)\s+(.+)/i,
  /(?:unlock|bypass|flash|activation)\s+(?:for\s+)?(.+)/i,
  /(?:iphone|ipad|samsung|huawei|xiaomi|oppo|vivo)\s+(.+)/i,
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function scoreTool(query: string, tool: Tool): number {
  const tokens = tokenize(query);
  const q = query.toLowerCase().trim();
  const name = tool.name.toLowerCase();
  const slug = tool.slug.replace(/-/g, " ");
  const desc = (tool.description ?? "").toLowerCase();
  const haystack = `${name} ${slug} ${desc}`;

  let score = 0;

  if (name.includes(q) || q.includes(name)) score += 20;
  if (slug.includes(q) || q.includes(slug)) score += 15;

  for (const token of tokens) {
    if (name.includes(token)) score += token.length + 2;
    if (slug.includes(token)) score += token.length;
    if (desc.includes(token)) score += Math.min(token.length, 4);
  }

  const modelMatch = q.match(/\b(iphone|ipad)\s*(\d{1,2})?\s*(pro|max|plus|mini)?/i);
  if (modelMatch) {
    const needle = modelMatch[0].toLowerCase().replace(/\s+/g, " ");
    if (haystack.includes(needle.replace(/\s+/g, "")) || haystack.includes(needle)) {
      score += 12;
    }
  }

  return score;
}

export function matchToolInCatalog(query: string, tools: Tool[]): Tool | null {
  const q = query.trim();
  if (!q || tools.length === 0) return null;

  let best: { tool: Tool; score: number } | null = null;

  for (const tool of tools) {
    const score = scoreTool(q, tool);
    if (score > 0 && (!best || score > best.score)) {
      best = { tool, score };
    }
  }

  return best && best.score >= 5 ? best.tool : null;
}

export function extractToolWish(query: string): string | null {
  for (const pattern of TOOL_SEARCH_PATTERNS) {
    const m = query.match(pattern);
    if (m?.[1]) {
      const name = m[1]
        .replace(/\?+$/, "")
        .replace(/on (the )?site/i, "")
        .trim()
        .slice(0, 120);
      if (name.length >= 3) return name;
    }
  }

  if (/don't see|dont see|not find|no tool|missing|upload/i.test(query)) {
    return query.slice(0, 120);
  }

  return null;
}

export function looksLikeToolSearch(query: string) {
  return /tool|unlock|bypass|flash|iphone|ipad|apple|samsung|huawei|looking|find|have|need|want|activation|imei/i.test(
    query
  );
}

export function analyzeToolQuery(
  query: string,
  tools: Tool[]
): {
  matched: Tool | null;
  wish: string | null;
  shouldOfferRequest: boolean;
} {
  const matched = matchToolInCatalog(query, tools);
  const wish = extractToolWish(query);
  const shouldOfferRequest =
    !matched &&
    looksLikeToolSearch(query) &&
    (wish !== null || tools.length === 0);

  return { matched, wish, shouldOfferRequest };
}

export function buildToolMatchReply(tool: Tool, isLoggedIn: boolean) {
  const currency = getSiteCurrency();
  const fee = getPlatformFeeAmount();
  const total = Number(tool.retail_price) + fee;
  const loginNote = isLoggedIn
    ? ""
    : "\n\nSign in first at [/auth/login](/auth/login), then add wallet funds at [/dashboard?tab=wallet](/dashboard?tab=wallet).";

  return (
    `Found it: **[${tool.name}](/tools/${tool.slug})**\n\n` +
    `Price: ${formatSiteCurrency(tool.retail_price, currency)} + ${formatSiteCurrency(fee, currency)} service fee = **${formatSiteCurrency(total, currency)}** from wallet.\n\n` +
    `1. Open the tool page\n` +
    `2. Enter your device ID (IMEI etc.)\n` +
    `3. Pay from wallet\n` +
    `4. Get your key on [/dashboard?tab=activations](/dashboard?tab=activations)${loginNote}`
  );
}

export function buildToolRequestReply(toolName: string, isLoggedIn: boolean) {
  const loginNote = isLoggedIn
    ? ""
    : "\n\nTip: [Sign in](/auth/login) first so we can link the request to your account.";

  return (
    `I couldn't find **${toolName}** in our catalog right now.\n\n` +
    `I can **notify the admin** to add this tool. They usually upload requested tools within a few hours — check back at [/tools](/tools).\n\n` +
    `Tap **Notify admin** below to send your request.${loginNote}`
  );
}
