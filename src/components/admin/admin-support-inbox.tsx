"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
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

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6 min-h-[500px]">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 text-sm font-medium text-zinc-400">
          Customers
        </div>
        <div className="max-h-[480px] overflow-y-auto">
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
                  "w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] transition-colors",
                  selectedUser === c.user_id && "bg-white/[0.06]"
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
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {c.last_message}
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  {formatDate(c.last_at)}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        {selectedUser ? (
          <>
            <div className="mb-4 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-cyan-400" />
              <span className="font-medium text-white">
                {selected?.full_name || selected?.email || "Customer"}
              </span>
              {selected?.email && selected.full_name && (
                <span className="text-xs text-zinc-500">{selected.email}</span>
              )}
            </div>
            <SupportChat
              apiBase={`/api/admin/support/${selectedUser}/messages`}
              emptyHint="Reply to this customer below."
              viewerRole="admin"
            />
          </>
        ) : (
          <div className="glass rounded-2xl p-12 text-center text-zinc-500">
            Select a customer to view the conversation
          </div>
        )}
      </div>
    </div>
  );
}
