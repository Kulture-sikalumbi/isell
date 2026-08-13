"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { SupportChat } from "@/components/support/support-chat";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";

interface Conversation {
  user_id: string;
  email: string;
  full_name: string | null;
  last_message: string;
  last_at: string;
  unread_admin: number;
}

export function AdminSupportInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedUser = searchParams.get("user");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/support/conversations")
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []))
      .finally(() => setLoading(false));
  }, []);

  const selected = conversations.find((c) => c.user_id === selectedUser);

  // ─────────────────────────────────────────────────────────────────────────────
  // Layout:
  //
  // Mobile (< lg):
  //   • No user selected  → Customer list takes full screen
  //   • User selected     → Chat takes full screen with back button
  //
  // Desktop (≥ lg):
  //   • Left: Customer list (280px, independent scrolling)
  //   • Right: Chat (flex-1, self-contained with fixed header/footer)

  return (
    // Fills the height given by AdminShell (h-screen overflow-hidden chain).
    // Each panel scrolls independently — the page body never scrolls.
    <div className="flex h-full w-full overflow-hidden gap-6">

      {/* ── Customer List: fixed width, independent scroll ── */}
      <div
        className={cn(
          "glass rounded-2xl flex flex-col overflow-hidden",
          // Mobile: visible only when no conversation is selected
          selectedUser ? "hidden lg:flex" : "flex flex-1 min-h-0",
          // Desktop: always visible, fixed 280 px, fills container height
          "lg:flex lg:w-70 lg:shrink-0 lg:h-full"
        )}
      >
        {/* Header — never scrolls */}
        <div className="px-4 py-3 border-b border-white/5 text-sm font-medium text-zinc-400 shrink-0">
          Customers
        </div>
        {/* List — scrolls independently */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <p className="p-4 text-sm text-zinc-500">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No messages yet</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.user_id}
                type="button"
                onClick={() => router.push(`/admin/messages?user=${c.user_id}`)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-colors",
                  selectedUser === c.user_id && "bg-white/6"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {c.full_name || c.email}
                  </span>
                  {c.unread_admin > 0 && (
                    <Badge variant="info">{c.unread_admin}</Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5">{c.last_message}</p>
                <p className="text-[10px] text-zinc-600 mt-1">{formatDate(c.last_at)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat Panel: fills remaining width, self-contained chat app ── */}
      <div
        className={cn(
          "flex flex-col overflow-hidden",
          // Mobile: visible only when a conversation is open
          selectedUser ? "flex flex-1 min-h-0" : "hidden lg:flex",
          // Desktop: always visible, fills remaining width
          "lg:flex lg:flex-1 lg:h-full"
        )}
      >
        {selectedUser ? (
          // glass wrapper so the chat has the same visual card treatment
          <div className="glass rounded-2xl flex flex-col h-full w-full overflow-hidden">

            {/* Header — never scrolls */}
            <div className="px-4 py-3 border-b border-white/10 shrink-0 flex items-center gap-2">
              <button
                onClick={() => router.push("/admin/messages")}
                className="lg:hidden shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Back to customer list"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <MessageCircle className="h-4 w-4 text-cyan-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate text-sm">
                  {selected?.full_name || selected?.email || "Customer"}
                </p>
                {selected?.email && selected.full_name && (
                  <p className="text-xs text-zinc-500 truncate">{selected.email}</p>
                )}
              </div>
            </div>

            {/* SupportChat fills remaining space.
                Its messages area scrolls independently.
                Its input bar stays pinned to the bottom.
                fullscreen removes its own internal header/card chrome. */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <SupportChat
                apiBase={`/api/admin/support/${selectedUser}/messages`}
                emptyHint="Reply to this customer below."
                viewerRole="admin"
                userId={selectedUser ?? undefined}
                customerName={selected?.full_name || selected?.email || undefined}
                fullscreen
              />
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl h-full flex items-center justify-center text-zinc-500">
            Select a customer to view the conversation
          </div>
        )}
      </div>
    </div>
  );
}
