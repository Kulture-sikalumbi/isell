"use client";

import { useLiveAdminStats } from "@/hooks/use-live-admin-stats";
import type { AdminAttentionCounts } from "@/types/admin-stats";

export type { AdminAttentionCounts };

export function useAdminAttentionCounts(): AdminAttentionCounts {
  const { counts } = useLiveAdminStats();
  return counts;
}

export function AdminNavBadge({
  count,
  variant = "amber",
}: {
  count: number;
  variant?: "amber" | "cyan";
}) {
  if (count <= 0) return null;

  return (
    <span
      className={
        variant === "cyan"
          ? "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500/20 px-1.5 text-[10px] font-semibold text-cyan-300 animate-badge-pop"
          : "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/25 px-1.5 text-[10px] font-bold text-amber-200 ring-1 ring-amber-500/30 animate-badge-pop"
      }
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
