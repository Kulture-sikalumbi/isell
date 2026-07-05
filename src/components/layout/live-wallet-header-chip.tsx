"use client";

import { WalletHeaderChip } from "@/components/layout/wallet-header-chip";
import { useLiveWalletBalance } from "@/hooks/use-live-wallet-balance";
import { getSiteCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface LiveWalletHeaderChipProps {
  userId: string;
  initialBalance: number;
  currency?: string;
  className?: string;
  compact?: boolean;
}

export function LiveWalletHeaderChip({
  userId,
  initialBalance,
  currency: _currency,
  className,
  compact,
}: LiveWalletHeaderChipProps) {
  const displayCurrency = getSiteCurrency();
  const { balance, justUpdated } = useLiveWalletBalance(
    userId,
    initialBalance,
    displayCurrency
  );

  return (
    <div
      className={cn(
        "transition-all duration-500 rounded-full",
        justUpdated && "ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20"
      )}
    >
      <WalletHeaderChip
        balance={balance}
        currency={displayCurrency}
        className={className}
        compact={compact}
      />
    </div>
  );
}
