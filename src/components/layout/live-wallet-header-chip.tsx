"use client";

import { WalletHeaderChip } from "@/components/layout/wallet-header-chip";
import { useLiveWalletBalance } from "@/hooks/use-live-wallet-balance";
import { cn } from "@/lib/utils";

interface LiveWalletHeaderChipProps {
  userId: string;
  initialBalance: number;
  currency?: string;
  displayCurrency?: import("@/lib/display-currency-preference").DisplayCurrency | null;
  nativeCurrency?: string | null;
  fxRate?: number | null;
  className?: string;
  compact?: boolean;
}

export function LiveWalletHeaderChip({
  userId,
  initialBalance,
  currency,
  displayCurrency,
  nativeCurrency,
  fxRate,
  className,
  compact,
}: LiveWalletHeaderChipProps) {
  const displayCurrencyResolved = currency ?? "USD";
  const { balance, justUpdated } = useLiveWalletBalance(
    userId,
    initialBalance,
    displayCurrencyResolved,
    { nativeCurrency, fxRate }
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
        currency={displayCurrencyResolved}
        displayCurrency={displayCurrency}
        className={className}
        compact={compact}
      />
    </div>
  );
}
