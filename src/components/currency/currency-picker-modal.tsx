"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Globe, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import type { DisplayCurrency } from "@/lib/display-currency-preference";
import { cn } from "@/lib/utils";

interface CurrencyPickerModalProps {
  open: boolean;
  required?: boolean;
  onClose?: () => void;
  onSaved?: (currency: DisplayCurrency) => void;
}

const OPTIONS: {
  id: DisplayCurrency;
  title: string;
  subtitle: string;
  icon: typeof MapPin;
}[] = [
  {
    id: "ZMW",
    title: "Zambia",
    subtitle: "Prices and wallet in Kwacha (K) — MTN, Airtel, Binance & USDT available",
    icon: MapPin,
  },
  {
    id: "USD",
    title: "International",
    subtitle: "Prices and wallet in US Dollars ($) — MoMo still works (pays in ZMW)",
    icon: Globe,
  },
];

export function CurrencyPickerModal({
  open,
  required = false,
  onClose,
  onSaved,
}: CurrencyPickerModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState<DisplayCurrency | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    return acquireBodyScrollLock();
  }, [open]);

  async function choose(currency: DisplayCurrency) {
    setLoading(currency);
    setError("");

    try {
      const res = await fetch("/api/user/display-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      onSaved?.(currency);
      if (!required) onClose?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(null);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[260] overflow-y-auto overscroll-contain" role="presentation">
      <div className="flex min-h-[100dvh] items-center justify-center p-4 sm:p-6">
        {!required && (
          <button
            type="button"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={onClose}
          />
        )}
        {required && <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" aria-hidden />}

        <div
          className="relative z-10 w-full max-w-md panel-solid rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="currency-picker-title"
        >
          <h2 id="currency-picker-title" className="text-xl font-semibold text-white">
            {required ? "Choose your currency" : "Change currency"}
          </h2>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            {required
              ? "Pick how you want prices and wallet balance shown. You only need to choose once — change it later from the menu anytime. MTN and Airtel always collect ZMW; Binance and USDT stay in USD."
              : "Switch between Kwacha for Zambia and US Dollars for international. Display only — your stored balances are unchanged. MoMo pays in ZMW; crypto stays USD."}
          </p>

          <div className="mt-6 space-y-3">
            {OPTIONS.map((opt) => {
              const busy = loading === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={Boolean(loading)}
                  onClick={() => choose(opt.id)}
                  className={cn(
                    "w-full flex items-center gap-4 rounded-xl border px-4 py-4 text-left transition-colors",
                    "border-white/10 bg-white/[0.03] hover:border-cyan-500/40 hover:bg-cyan-500/5",
                    busy && "border-cyan-500/40 bg-cyan-500/10"
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                    {busy ? (
                      <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                    ) : (
                      <opt.icon className="h-5 w-5 text-cyan-400" />
                    )}
                  </span>
                  <span>
                    <span className="block font-medium text-white">{opt.title}</span>
                    <span className="block text-xs text-zinc-500 mt-0.5">{opt.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!required && (
            <Button type="button" variant="secondary" className="w-full mt-5" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
