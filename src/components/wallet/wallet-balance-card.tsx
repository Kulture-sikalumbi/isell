"use client";

import Link from "next/link";
import { Plus, Sparkles, Wallet } from "lucide-react";
import { WALLET_DEPOSIT_BANNER_COPY } from "@/lib/wallet-payment-copy";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WalletBalanceCardProps {
  balance: number;
  currency: string;
  pendingCount?: number;
  onDepositClick?: () => void;
  depositHref?: string;
  compact?: boolean;
}

export function WalletBalanceCard({
  balance,
  currency,
  pendingCount = 0,
  onDepositClick,
  depositHref,
  compact,
}: WalletBalanceCardProps) {
  function scrollToDeposit() {
    onDepositClick?.();
    const el = document.getElementById("wallet-deposit");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const depositControl = depositHref ? (
    <Link
      href={depositHref}
      className={cn(
        "shrink-0 group flex flex-col items-center justify-center rounded-2xl",
        "bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/25",
        "hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all",
        compact ? "h-14 w-14" : "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
      )}
      aria-label="Add deposit"
    >
      <Plus className={cn("transition-transform group-hover:rotate-90", compact ? "h-5 w-5" : "h-6 w-6")} />
      {!compact && (
        <span className="text-[10px] font-semibold mt-0.5 uppercase tracking-wide">Deposit</span>
      )}
    </Link>
  ) : (
    <button
      type="button"
      onClick={scrollToDeposit}
      className={cn(
        "shrink-0 group flex flex-col items-center justify-center rounded-2xl",
        "bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/25",
        "hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all",
        compact ? "h-14 w-14" : "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
      )}
      aria-label="Add deposit"
    >
      <Plus className={cn("transition-transform group-hover:rotate-90", compact ? "h-5 w-5" : "h-6 w-6")} />
      {!compact && (
        <span className="text-[10px] font-semibold mt-0.5 uppercase tracking-wide">Deposit</span>
      )}
    </button>
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-cyan-500/25 shadow-lg shadow-cyan-500/5",
        compact ? "p-4" : "p-6 sm:p-7"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-violet-600/10 to-transparent pointer-events-none" />
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-500/30">
              <Wallet className="h-4 w-4 text-cyan-300" />
            </span>
            <p className="text-xs font-medium uppercase tracking-wider text-cyan-200/80">
              Available balance
            </p>
          </div>
          <p
            className={cn(
              "font-bold text-white tracking-tight",
              compact ? "text-2xl" : "text-3xl sm:text-4xl"
            )}
          >
            {formatCurrency(balance, currency)}
          </p>
          {!compact && (
            <p className="mt-2 text-xs text-zinc-400 max-w-sm leading-relaxed flex items-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
              {WALLET_DEPOSIT_BANNER_COPY}
            </p>
          )}
          {pendingCount > 0 && (
            <p className="mt-2 text-xs text-amber-300/90">
              {pendingCount} deposit{pendingCount !== 1 ? "s" : ""} awaiting verification
            </p>
          )}
        </div>

        {depositControl}
      </div>
    </div>
  );
}
