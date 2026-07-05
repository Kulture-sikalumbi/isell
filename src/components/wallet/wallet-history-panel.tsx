"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { WalletBalanceCard } from "@/components/wallet/wallet-balance-card";
import { WalletHistoryList } from "@/components/wallet/wallet-history-list";

interface WalletHistoryPanelProps {
  balance: number;
  currency: string;
  pendingDepositCount: number;
}

export function WalletHistoryPanel({
  balance,
  currency,
  pendingDepositCount,
}: WalletHistoryPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <WalletBalanceCard
            balance={balance}
            currency={currency}
            pendingCount={pendingDepositCount}
            depositHref="/dashboard?tab=wallet#wallet-deposit"
            compact
          />
        </div>
        <Link
          href="/dashboard?tab=wallet#wallet-deposit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          New deposit
        </Link>
      </div>

      <WalletHistoryList />
    </div>
  );
}
