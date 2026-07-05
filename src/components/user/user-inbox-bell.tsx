"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { subscribeToTables } from "@/lib/realtime";
import { offlineAwareFetch } from "@/lib/offline-fetch";
import { cn } from "@/lib/utils";

const INBOX_POLL_MS = 20_000;

interface UserInboxBellProps {
  userId: string;
  initialUnread?: number;
  compact?: boolean;
}

export function UserInboxBell({ userId, initialUnread = 0, compact }: UserInboxBellProps) {
  const [unread, setUnread] = useState(initialUnread);

  const refresh = useCallback(async () => {
    try {
      const res = await offlineAwareFetch("/api/user/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUnread(data.unread ?? 0);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    refresh();

    const unsub = subscribeToTables(
      `user-inbox:${userId}`,
      ["user_notifications"],
      refresh
    );

    const interval = setInterval(refresh, INBOX_POLL_MS);

    return () => {
      unsub?.();
      clearInterval(interval);
    };
  }, [userId, refresh]);

  return (
    <Link
      href="/dashboard?tab=inbox"
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors",
        compact ? "h-9 w-9" : "h-10 w-10"
      )}
      aria-label={`Inbox${unread > 0 ? `, ${unread} unread` : ""}`}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
