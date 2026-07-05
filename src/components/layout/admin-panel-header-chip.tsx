"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { useLiveAdminStats } from "@/hooks/use-live-admin-stats";
import { cn } from "@/lib/utils";

interface AdminPanelHeaderChipProps {
  initialAttention?: number;
  className?: string;
  compact?: boolean;
}

export function AdminPanelHeaderChip({
  initialAttention = 0,
  className,
  compact,
}: AdminPanelHeaderChipProps) {
  const { counts, justUpdated } = useLiveAdminStats();
  const attention = counts.totalAttention || initialAttention;
  const hasAttention = attention > 0;

  if (compact) {
    return (
      <Link
        href="/admin"
        className={cn(
          "relative flex items-center gap-1.5 min-w-0 rounded-full border border-amber-500/35 bg-gradient-to-r from-amber-500/20 to-orange-600/10 pl-2.5 pr-3 py-1 shadow-sm shadow-amber-500/10",
          justUpdated && "ring-2 ring-amber-400/40",
          className
        )}
      >
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/25">
          <Shield className="h-3.5 w-3.5 text-amber-200" />
          {hasAttention && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white animate-pulse">
              {attention > 9 ? "9+" : attention}
            </span>
          )}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
            Admin
          </p>
          <p className="truncate text-xs font-semibold text-white">Control panel</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/admin"
      className={cn(
        "relative flex items-center gap-2 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-orange-600/10 px-3 py-1.5 text-sm shadow-sm shadow-amber-500/10 hover:from-amber-500/25 hover:to-orange-600/15 transition-all",
        justUpdated && "ring-2 ring-amber-400/40",
        className
      )}
    >
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/25">
        <Shield className="h-4 w-4 text-amber-200" />
        {hasAttention && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse">
            {attention > 99 ? "99+" : attention}
          </span>
        )}
      </span>
      <span className="font-semibold text-white">Control panel</span>
      {hasAttention && (
        <span className="hidden sm:inline rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-200">
          {attention} need attention
        </span>
      )}
    </Link>
  );
}
