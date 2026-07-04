"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { SupportMessage } from "@/types/database";

interface SupportChatProps {
  apiBase: string;
  emptyHint?: string;
  pollMs?: number;
  viewerRole?: "user" | "admin";
}

export function SupportChat({
  apiBase,
  emptyHint = "Send a message to start the conversation.",
  pollMs = 15000,
  viewerRole = "user",
}: SupportChatProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    try {
      const res = await fetch(apiBase);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, pollMs);
    return () => clearInterval(interval);
  }, [apiBase, pollMs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        setInput(text);
      }
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl flex flex-col h-[min(60vh,480px)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-zinc-500 py-8">{emptyHint}</p>
        ) : (
          messages.map((m) => {
            const isMine =
              viewerRole === "user"
                ? m.sender_role === "user"
                : m.sender_role === "admin";
            return (
              <div
                key={m.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    isMine
                      ? "bg-cyan-500/20 text-cyan-100"
                      : "bg-white/10 text-zinc-200"
                  }`}
                >
                  <p className="text-[10px] text-zinc-500 mb-1">
                    {viewerRole === "user"
                      ? m.sender_role === "user"
                        ? "You"
                        : "Admin"
                      : m.sender_role === "admin"
                        ? "You"
                        : "Customer"}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {formatDate(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-white/10 p-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/40"
        />
        <Button type="submit" size="sm" disabled={sending || !input.trim()}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
