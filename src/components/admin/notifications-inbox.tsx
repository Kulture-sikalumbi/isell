"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { AdminNotification } from "@/types/database";

interface NotificationsInboxProps {
  notifications: AdminNotification[];
}

export function NotificationsInbox({ notifications }: NotificationsInboxProps) {
  const router = useRouter();

  async function markRead(id: string) {
    await fetch(`/api/admin/notifications/${id}/read`, { method: "POST" });
    router.refresh();
  }

  async function markAllRead() {
    await fetch("/api/admin/notifications/read-all", { method: "POST" });
    router.refresh();
  }

  const unread = notifications.filter((n) => !n.read_at);

  if (notifications.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-zinc-500">
        <Bell className="h-10 w-10 mx-auto mb-4 opacity-40" />
        No notifications yet. New customer orders will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unread.length > 0 && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      )}

      <div className="glass rounded-2xl divide-y divide-white/5">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-5 ${!n.read_at ? "bg-cyan-500/[0.03]" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-white">{n.title}</p>
                  {!n.read_at && <Badge variant="info">New</Badge>}
                </div>
                <p className="text-sm text-zinc-400">{n.message}</p>
                <p className="text-xs text-zinc-600 mt-2">{formatDate(n.created_at)}</p>
              </div>
              <div className="flex gap-2">
                {n.payment_id && (
                  <Link href="/admin/payments">
                    <Button size="sm" variant="secondary">
                      View order
                    </Button>
                  </Link>
                )}
                {!n.read_at && (
                  <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
