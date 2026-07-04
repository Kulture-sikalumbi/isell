import type { Tool } from "@/types/database";

const TOOL_SEARCH_PATTERNS = [
  /(?:looking for|need|want|find|searching for|do you have|got any|where is)\s+(.+)/i,
  /(?:unlock|tool|bypass|flash)\s+(?:for\s+)?(.+)/i,
];

export function matchToolInCatalog(query: string, tools: Tool[]) {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  return (
    tools.find(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.replace(/-/g, " ").includes(q) ||
        q.includes(t.name.toLowerCase())
    ) ?? null
  );
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
  return /tool|unlock|bypass|flash|iphone|ipad|apple|download|looking|find|have|need|want/i.test(
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
