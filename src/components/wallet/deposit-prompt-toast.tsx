"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Wallet, X } from "lucide-react";
import { AirtelMoneyIcon, MtnMoMoIcon } from "@/components/payments/payment-method-icons";
import { useLiveWalletBalance } from "@/hooks/use-live-wallet-balance";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface DepositPromptToastProps {
  userId: string;
  initialBalance: number;
  currency: string;
}

export function DepositPromptToast({
  userId,
  initialBalance,
  currency,
}: DepositPromptToastProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { balance } = useLiveWalletBalance(userId, initialBalance, currency);
  const [dismissed, setDismissed] = useState(false);

  const onWalletTab =
    pathname.startsWith("/dashboard") && searchParams.get("tab") === "wallet";

  useEffect(() => {
    setDismissed(false);
  }, [pathname, searchParams]);

  function dismiss() {
    setDismissed(true);
  }

  if (onWalletTab || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[90] flex justify-center pointer-events-none sm:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-lg rounded-2xl border border-cyan-500/30",
          "bg-[#0f1016]/95 backdrop-blur-md shadow-2xl shadow-black/40"
        )}
      >
        <div className="flex gap-3 p-4 sm:p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/25">
            <Wallet className="h-5 w-5 text-cyan-300" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white leading-snug">
              Add wallet funds for faster checkout
            </p>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Deposit via MTN or Airtel once — then activate tools instantly without paying
              each time. Balance:{" "}
              <span className="font-medium text-zinc-200">{formatCurrency(balance, currency)}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard?tab=wallet"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-3.5 py-2 text-xs font-semibold text-white hover:brightness-110 transition-all"
              >
                <Wallet className="h-3.5 w-3.5" />
                Deposit funds
              </Link>
              <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500">
                <MtnMoMoIcon className="h-5 w-5 text-[8px]" />
                <AirtelMoneyIcon className="h-5 w-5 text-[7px]" />
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors self-start"
            aria-label="Dismiss deposit reminder"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
