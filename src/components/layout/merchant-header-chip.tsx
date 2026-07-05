"use client";

import Link from "next/link";
import { Landmark, TrendingUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface MerchantHeaderChipProps {
  balance: number;
  platformFees?: number;
  currency?: string;
  className?: string;
  compact?: boolean;
}

export function MerchantHeaderChip({
  balance,
  platformFees = 0,
  currency = "ZMW",
  className,
  compact = false,
}: MerchantHeaderChipProps) {
  const formatted = formatCurrency(balance, currency);

  if (compact) {
    return (
      <Link
        href="/admin/ledger"
        className={cn(
          "flex items-center gap-1.5 min-w-0 rounded-full border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-orange-500/5 pl-2.5 pr-3 py-1",
          className
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <Landmark className="h-3 w-3 text-amber-300" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-[10px] text-amber-200/70 uppercase tracking-wide">Sales</p>
          <p className="truncate text-xs sm:text-sm font-semibold text-white">{formatted}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/admin/ledger"
      className={cn(
        "flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-sm hover:bg-amber-500/10 transition-colors",
        className
      )}
    >
      <Landmark className="h-3.5 w-3.5 text-amber-400" />
      <span className="text-zinc-400 hidden sm:inline">Processed sales</span>
      <span className="font-semibold text-white">{formatted}</span>
      {platformFees > 0 && (
        <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          <TrendingUp className="h-3 w-3" />
          {formatCurrency(platformFees, currency)} fees
        </span>
      )}
    </Link>
  );
}
