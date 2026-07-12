"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { CurrencyPickerModal } from "@/components/currency/currency-picker-modal";
import type { DisplayCurrency } from "@/lib/display-currency-preference";
import { cn } from "@/lib/utils";

interface CurrencyMenuButtonProps {
  currentCurrency?: DisplayCurrency | null;
  variant?: "drawer" | "dropdown";
  active?: boolean;
  admin?: boolean;
  /** When set, parent owns the picker modal (avoids unmount when drawer/dropdown closes). */
  onOpenPicker?: () => void;
  onNavigate?: () => void;
}

function currencyLabel(code?: DisplayCurrency | null): string {
  if (code === "ZMW") return "Zambia (K)";
  if (code === "USD") return "International ($)";
  return "Choose currency";
}

export function CurrencyMenuButton({
  currentCurrency,
  variant = "drawer",
  active = false,
  admin = false,
  onOpenPicker,
  onNavigate,
}: CurrencyMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const controlled = Boolean(onOpenPicker);

  function openPicker(e: React.MouseEvent) {
    e.stopPropagation();
    if (controlled) {
      onNavigate?.();
      onOpenPicker?.();
      return;
    }
    onNavigate?.();
    setOpen(true);
  }

  if (admin) return null;

  if (variant === "dropdown") {
    return (
      <>
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
        >
          <Coins className="h-4 w-4 text-amber-400" />
          <span className="flex-1 text-left">Currency</span>
          <span className="text-xs text-zinc-500">{currencyLabel(currentCurrency)}</span>
        </button>
        {!controlled && <CurrencyPickerModal open={open} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium border transition-colors text-left",
          active
            ? "text-white bg-cyan-500/15 border-cyan-500/35"
            : "text-zinc-100 bg-[#181a24] border-white/10 hover:bg-[#1e2130] hover:border-white/20"
        )}
      >
        <Coins className="h-4 w-4 shrink-0 text-amber-400" />
        <span className="flex-1">Currency</span>
        <span className="text-[10px] text-zinc-500">{currencyLabel(currentCurrency)}</span>
      </button>
      {!controlled && <CurrencyPickerModal open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
