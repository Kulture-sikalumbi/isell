"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, X, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Admin Copilot here. I know your **live queue** — deposits, orders, messages, and accounting.\n\nAsk things like:\n• What needs attention?\n• Any deposits ready to confirm?\n• Where do I fulfill orders?",
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
            className="text-amber-400 underline underline-offset-2 hover:text-amber-300"
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

export function AdminAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || loading) return;

      const userMsg: Message = { role: "user", content: text };
      const apiMessages = [...messages, userMsg];
      setMessages(apiMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/admin/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed");

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Try:\n• [/admin/deposits](/admin/deposits)\n• [/admin/payments](/admin/payments)\n• [/admin/inbox](/admin/inbox)",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
          "bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:scale-105 hover:shadow-amber-500/30"
        )}
        aria-label={open ? "Close admin copilot" : "Open admin copilot"}
      >
        {open ? <X className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[min(100vw-2rem,400px)] flex-col rounded-2xl border border-amber-500/20 bg-[#0a0b10]/95 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3 bg-amber-500/5">
            <p className="font-semibold text-white text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              Admin Copilot
            </p>
            <p className="text-xs text-zinc-500">Live deposits, orders, inbox & accounting</p>
          </div>

          <div className="flex-1 max-h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm leading-relaxed max-w-[95%] whitespace-pre-wrap",
                  m.role === "user"
                    ? "ml-auto bg-amber-500/20 text-amber-100"
                    : "bg-white/5 text-zinc-300"
                )}
              >
                {m.role === "assistant"
                  ? renderMessageContent(m.content)
                  : m.content}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking live data…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-white/10 p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Any deposits to confirm?"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-amber-500/20 p-2 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
