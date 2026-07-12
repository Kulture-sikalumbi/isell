"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Wallet, History, ChevronDown, CreditCard } from "lucide-react";
import { CurrencyMenuButton } from "@/components/currency/currency-menu-button";
import { CurrencyPickerModal } from "@/components/currency/currency-picker-modal";
import { getClientDisplayCurrency } from "@/lib/format-currency";
import type { DisplayCurrency } from "@/lib/display-currency-preference";
import { walletPaymentMethodsShort } from "@/lib/wallet-payment-copy";
import { cn, formatCurrency } from "@/lib/utils";

interface WalletHeaderChipProps {
  balance: number;
  currency?: string;
  displayCurrency?: DisplayCurrency | null;
  className?: string;
  compact?: boolean;
}

export function WalletHeaderChip({
  balance,
  currency = getClientDisplayCurrency(),
  displayCurrency,
  className,
  compact = false,
}: WalletHeaderChipProps) {
  const [open, setOpen] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const formatted = formatCurrency(balance, currency);

  const currencyPicker = (
    <CurrencyPickerModal
      open={currencyPickerOpen}
      onClose={() => setCurrencyPickerOpen(false)}
    />
  );

  if (compact) {
    return (
      <div ref={ref} className={cn("relative flex items-center gap-1.5 min-w-0", className)}>
        {currencyPicker}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 min-w-0 rounded-full border border-cyan-500/25 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 pl-2.5 pr-1 py-1 shadow-sm shadow-cyan-500/10"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20">
            <Wallet className="h-3 w-3 text-cyan-300" />
          </span>
          <span className="truncate text-xs sm:text-sm font-semibold text-white max-w-[88px] sm:max-w-none">
            {formatted}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-cyan-400/80 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        <Link
          href="/dashboard?tab=wallet"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/30 hover:brightness-110 transition-all"
          aria-label="Add funds"
          title="Add funds"
        >
          <Plus className="h-4 w-4" />
        </Link>

        {open && (
          <div className="absolute top-full right-0 mt-2 w-52 panel-solid rounded-xl border border-white/10 p-2 shadow-2xl z-[60] animate-fade-in">
            <p className="px-3 py-2 text-xs text-zinc-500">Your prepaid balance</p>
            <p className="px-3 pb-2 text-lg font-bold text-white">{formatted}</p>
            <Link
              href="/dashboard?tab=wallet#wallet-deposit"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
            >
              <Plus className="h-4 w-4 text-cyan-400" />
              Add funds
            </Link>
            <Link
              href="/dashboard?tab=history"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
            >
              <History className="h-4 w-4 text-zinc-400" />
              Transaction history
            </Link>
            <Link
              href="/dashboard?tab=wallet#wallet-payment-methods"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
            >
              <CreditCard className="h-4 w-4 text-violet-400" />
              Payment methods
            </Link>
            <CurrencyMenuButton
              currentCurrency={displayCurrency ?? (currency as DisplayCurrency)}
              variant="dropdown"
              onOpenPicker={() => {
                setOpen(false);
                setCurrencyPickerOpen(true);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative flex items-center gap-2", className)}>
      {currencyPicker}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-1.5 text-sm hover:bg-cyan-500/10 transition-colors"
      >
        <Wallet className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-zinc-400 hidden sm:inline">Balance</span>
        <span className="font-semibold text-white">{formatted}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-500 transition-transform", open && "rotate-180")} />
      </button>
      <Link
        href="/dashboard?tab=wallet"
        className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-md shadow-cyan-500/25 hover:brightness-110 transition-all"
        aria-label="Add funds"
        title="Add funds"
      >
        <Plus className="h-4 w-4" />
      </Link>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 panel-solid rounded-xl border border-white/10 p-2 shadow-2xl z-[60]">
          <Link
            href="/dashboard?tab=wallet#wallet-deposit"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
          >
            <Plus className="h-4 w-4 text-cyan-400" />
            Add funds via {walletPaymentMethodsShort(currency)}
          </Link>
          <Link
            href="/dashboard?tab=history"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
          >
            <History className="h-4 w-4" />
            Transaction history
          </Link>
          <Link
            href="/dashboard?tab=wallet#wallet-payment-methods"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
          >
            <CreditCard className="h-4 w-4 text-violet-400" />
            Payment methods
          </Link>
          <CurrencyMenuButton
            currentCurrency={displayCurrency ?? (currency as DisplayCurrency)}
            variant="dropdown"
            onOpenPicker={() => {
              setOpen(false);
              setCurrencyPickerOpen(true);
            }}
          />
        </div>
      )}
    </div>
  );
}
