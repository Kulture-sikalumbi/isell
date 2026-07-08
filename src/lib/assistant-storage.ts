export const ASSISTANT_STORAGE_KEYS = {
  toolsCache: "isell_tools_v1",
  bubbleDismissed: "isell_assistant_bubble_v1",
  lastSearches: "isell_assistant_searches_v1",
  pendingToolRequest: "isell_pending_tool_request_v1",
} as const;

export interface CachedTool {
  name: string;
  slug: string;
  retail_price: number;
}

export interface AssistantToolsCache {
  tools: CachedTool[];
  fetchedAt: string;
}

export interface AssistantClientContext {
  isLoggedIn: boolean;
  userEmail?: string;
  walletBalance?: number;
  walletCurrency?: string;
  pendingDeposits?: number;
  cachedTools: CachedTool[];
  recentSearches: string[];
  currentPath?: string;
}

export function readToolsCache(): AssistantToolsCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ASSISTANT_STORAGE_KEYS.toolsCache);
    if (!raw) return null;
    return JSON.parse(raw) as AssistantToolsCache;
  } catch {
    return null;
  }
}

export function writeToolsCache(cache: AssistantToolsCache) {
  if (typeof window === "undefined") return;
  // Keep the assistant cache small so we never block Supabase auth token writes
  // (Supabase uses localStorage key like `sb-...-auth-token`).
  const safe: AssistantToolsCache = {
    ...cache,
    tools: Array.isArray(cache.tools) ? cache.tools.slice(0, 300) : [],
  };

  try {
    localStorage.setItem(ASSISTANT_STORAGE_KEYS.toolsCache, JSON.stringify(safe));
  } catch {
    // If storage quota is exceeded, drop our cache first (auth must win).
    try {
      localStorage.removeItem(ASSISTANT_STORAGE_KEYS.toolsCache);
    } catch {
      /* ignore */
    }
  }
}

export function isBubbleDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ASSISTANT_STORAGE_KEYS.bubbleDismissed) === "1";
}

export function dismissBubble() {
  if (typeof window === "undefined") return;
  localStorage.setItem(ASSISTANT_STORAGE_KEYS.bubbleDismissed, "1");
}

export function addRecentSearch(query: string) {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const raw = localStorage.getItem(ASSISTANT_STORAGE_KEYS.lastSearches);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [query.trim(), ...list.filter((s) => s !== query.trim())].slice(0, 8);
    localStorage.setItem(ASSISTANT_STORAGE_KEYS.lastSearches, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ASSISTANT_STORAGE_KEYS.lastSearches);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
