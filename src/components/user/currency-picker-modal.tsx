"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Globe, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import type { DisplayCurrency } from "@/lib/display-currency-preference";
import { cn } from "@/lib/utils";

const OPTIONS: {
  id: DisplayCurrency;
  title: string;
  subtitle: string;
  flag: string;
}[] = [
  {
    id: "ZMW",
    title: "Zambia",
    subtitle: "Prices and wallet in Kwacha (K) — MTN & Airtel MoMo",
    flag: "🇿🇲",
  },
  {
    id: "USD",
    title: "International",
    subtitle: "Prices and wallet in US Dollars ($) — Binance & crypto",
    flag: "🌍",
  },
];

interface CurrencyPickerModalProps {
  open: boolean;
  onClose?: () => void;
  /** First-time setup — cannot dismiss without choosing */
  required?: boolean;
  currentCurrency?: DisplayCurrency | null;
  title?: string;
  description?: string;
}

export function CurrencyPickerModal({
  open,
  onClose,
  required = false,
  currentCurrency,
  title = "Choose your currency",
  description = "This sets how prices and your wallet balance are shown. You can change it later from the menu.",
}: CurrencyPickerModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<DisplayCurrency | null>(currentCurrency ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(currentCurrency ?? null);
      setError("");
    }
  }, [open, currentCurrency]);

  useEffect(() => {
    if (!open) return;
    return acquireBodyScrollLock();
  }, [open]);

  async function handleSave() {
    if (!selected) {
      setError("Please select Zambia or International");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/display-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      router.refresh();
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
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
        {required && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" aria-hidden />
        )}

        <div
          className="relative z-10 w-full max-w-md panel-solid rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="currency-picker-title"
        >
          {!required && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/5"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30">
              <Globe className="h-5 w-5 text-cyan-400" />
            </span>
            <h2 id="currency-picker-title" className="text-lg font-semibold text-white pr-8">
              {title}
            </h2>
          </div>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{description}</p>

          <div className="space-y-3 mb-6">
            {OPTIONS.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelected(opt.id)}
                  className={cn(
                    "w-full rounded-xl border px-4 py-4 text-left transition-colors flex items-start gap-3",
                    isSelected
                      ? "border-cyan-400/50 bg-cyan-500/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  )}
                >
                  <span className="text-2xl leading-none mt-0.5">{opt.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">{opt.title}</p>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{opt.subtitle}</p>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-cyan-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            size="lg"
            loading={loading}
            disabled={!selected}
            onClick={handleSave}
          >
            {required ? "Continue" : "Save currency"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Prompts new users to pick ZMW or USD before using the store. */
export function CurrencyOnboardingGate() {
  const [needsSelection, setNeedsSelection] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/user/display-currency");
        if (!res.ok) {
          if (!cancelled) setChecking(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setNeedsSelection(Boolean(data.needsSelection));
          setChecking(false);
        }
      } catch {
        if (!cancelled) setChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking || !needsSelection) return null;

  return (
    <CurrencyPickerModal
      open
      required
      title="Welcome — pick your currency"
      description="Are you paying from Zambia or internationally? This sets your wallet currency and how prices appear."
    />
  );
}

/** Menu trigger to change currency preference. */
export function CurrencyPreferenceButton({
  className,
  onSelected,
}: {
  className?: string;
  onSelected?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<DisplayCurrency | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/user/display-currency")
      .then((r) => r.json())
      .then((d) => setCurrent(d.currency ?? null))
      .catch(() => {});
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        Change currency
      </button>
      <CurrencyPickerModal
        open={open}
        onClose={() => {
          setOpen(false);
          onSelected?.();
        }}
        currentCurrency={current}
        title="Change currency"
        description="Switch between Kwacha (Zambia) and US Dollars (international). Your wallet uses the selected currency."
      />
    </>
  );
}
