"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addRecentSearch,
  dismissBubble,
  isBubbleDismissed,
  readRecentSearches,
  readToolsCache,
  writeToolsCache,
  type AssistantClientContext,
  type CachedTool,
} from "@/lib/assistant-storage";
import { useConnectivityOptional } from "@/components/layout/connectivity-provider";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestToolRequest?: { toolName: string };
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I can help you **find tools**, **add wallet funds**, track **activations**, or check your **inbox**.\n\nTry: \"iPhone 14 unlock tool\" or \"how do I deposit?\"",
};

function renderMessageContent(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      if (href.startsWith("/")) {
        return (
          <Link
            key={i}
            href={href}
            className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
          >
            {label}
          </Link>
        );
      }
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {boldParts.map((seg, j) => {
          if (seg.startsWith("**") && seg.endsWith("**")) {
            return (
              <strong key={j} className="text-white font-medium">
                {seg.slice(2, -2)}
              </strong>
            );
          }
          return seg;
        })}
      </span>
    );
  });
}

export function SiteAssistant() {
  const pathname = usePathname();
  const connectivity = useConnectivityOptional();
  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string>();
  const [cachedTools, setCachedTools] = useState<CachedTool[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/catalog");
      const data = await res.json();
      if (data.tools) {
        writeToolsCache({ tools: data.tools, fetchedAt: data.fetchedAt });
        setCachedTools(data.tools);
      }
    } catch {
      const cache = readToolsCache();
      if (cache) setCachedTools(cache.tools);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    if (connectivity?.sessionHint?.loggedIn) {
      setIsLoggedIn(true);
      setUserEmail(connectivity.sessionHint.email);
    }

    if (!connectivity?.isOnline && connectivity?.wasLoggedIn) {
      return;
    }

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setIsLoggedIn(Boolean(d.loggedIn));
        setUserEmail(d.email);
      })
      .catch(() => {
        if (connectivity?.wasLoggedIn) {
          setIsLoggedIn(true);
        }
      });
  }, [connectivity?.isOnline, connectivity?.wasLoggedIn, connectivity?.sessionHint]);

  useEffect(() => {
    if (!isBubbleDismissed()) {
      const t = setTimeout(() => setShowBubble(true), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function openChat() {
    setOpen(true);
    setShowBubble(false);
    dismissBubble();
  }

  function buildClientContext(): AssistantClientContext {
    return {
      isLoggedIn,
      userEmail,
      cachedTools,
      recentSearches: readRecentSearches(),
      currentPath: pathname,
    };
  }

  async function submitToolRequest(toolName: string) {
    setRequesting(true);
    try {
      const res = await fetch("/api/tool-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedName: toolName,
          email: userEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            `Done! I've notified the admin about **${toolName}**.\n\n` +
            `Check back at [/tools](/tools) in a few hours — requested tools are usually added quickly.`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Couldn't send the request right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setRequesting(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    addRecentSearch(text);
    const userMsg: Message = { role: "user", content: text };
    const apiMessages = [...messages, userMsg];
    setMessages(apiMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          clientContext: buildClientContext(),
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          suggestToolRequest: data.suggestToolRequest,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Try these:\n• [Sign in](/auth/login)\n• [Browse tools](/tools)\n• [Orders](/dashboard)",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showBubble && !open && (
        <div className="fixed bottom-24 right-6 z-50 max-w-[220px] rounded-2xl border border-cyan-500/30 bg-[#0f1018] px-4 py-3 shadow-xl shadow-cyan-500/10">
          <div className="flex items-start gap-2">
            <button type="button" onClick={openChat} className="flex items-start gap-2 text-left flex-1">
              <Sparkles className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">What are you looking for?</p>
                <p className="text-xs text-zinc-500 mt-0.5">I can find tools & help you order</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBubble(false);
                dismissBubble();
              }}
              className="text-zinc-600 hover:text-zinc-400 shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openChat())}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
          "bg-gradient-to-br from-cyan-500 to-violet-500 text-white hover:scale-105 hover:shadow-cyan-500/30",
          showBubble && !open && "animate-pulse"
        )}
        aria-label={open ? "Close assistant" : "Open assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[min(100vw-2rem,380px)] flex-col rounded-2xl border border-white/10 bg-[#0a0b10]/95 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="font-semibold text-white text-sm">iSell Assistant</p>
            <p className="text-xs text-zinc-500">
              {isLoggedIn ? `Signed in · ${cachedTools.length} tools` : "Sign in to download & pay"}
            </p>
          </div>

          {!isLoggedIn && connectivity?.isOnline !== false && (
            <div className="mx-3 mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-200">
              <Link href="/auth/login" className="underline font-medium">
                Sign in with Google
              </Link>{" "}
              to download tools, pay, and view orders.
            </div>
          )}
          {!isLoggedIn && connectivity?.isOnline === false && connectivity?.wasLoggedIn && (
            <div className="mx-3 mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-200">
              You&apos;re offline but still signed in. Reconnect to use wallet and orders.
            </div>
          )}

          <div className="flex-1 max-h-72 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i}>
                <div
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm leading-relaxed max-w-[95%] whitespace-pre-wrap",
                    m.role === "user"
                      ? "ml-auto bg-cyan-500/20 text-cyan-100"
                      : "bg-white/5 text-zinc-300"
                  )}
                >
                  {m.role === "assistant"
                    ? renderMessageContent(m.content)
                    : m.content}
                </div>
                {m.suggestToolRequest && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      disabled={requesting}
                      onClick={() =>
                        submitToolRequest(m.suggestToolRequest!.toolName)
                      }
                    >
                      {requesting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Notify admin"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-white/10 p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. iPhone 14 unlock tool…"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-cyan-500/20 p-2 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
