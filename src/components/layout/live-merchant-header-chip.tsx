"use client";

import { MerchantHeaderChip } from "@/components/layout/merchant-header-chip";
import { useLiveAdminStats } from "@/hooks/use-live-admin-stats";
import { cn } from "@/lib/utils";

interface LiveMerchantHeaderChipProps {
  initialBalance: number;
  initialCurrency?: string;
  initialPlatformFees?: number;
  className?: string;
  compact?: boolean;
}

export function LiveMerchantHeaderChip({
  initialBalance,
  initialCurrency = "ZMW",
  initialPlatformFees = 0,
  className,
  compact,
}: LiveMerchantHeaderChipProps) {
  const { merchantBalance, merchantCurrency, platformFees, justUpdated } = useLiveAdminStats({
    merchantBalance: initialBalance,
    merchantCurrency: initialCurrency,
    platformFees: initialPlatformFees,
  });

  return (
    <div
      className={cn(
        "transition-all duration-500 rounded-full",
        justUpdated && "ring-2 ring-amber-400/40"
      )}
    >
      <MerchantHeaderChip
        balance={merchantBalance}
        platformFees={platformFees}
        currency={merchantCurrency}
        className={className}
        compact={compact}
      />
    </div>
  );
}
