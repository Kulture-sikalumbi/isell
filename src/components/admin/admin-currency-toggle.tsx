"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Coins, Loader2 } from "lucide-react";
import type { DisplayCurrency } from "@/lib/display-currency-preference";
import { cn } from "@/lib/utils";

interface AdminCurrencyToggleProps {
  current: DisplayCurrency;
  className?: string;
  compact?: boolean;
  onChanged?: (currency: DisplayCurrency) => void;
}

const OPTIONS: { id: DisplayCurrency; label: string; short: string }[] = [
  { id: "ZMW", label: "Zambia (K)", short: "K" },
  { id: "USD", label: "USD ($)", short: "$" },
];

/** Admin display preference — converts UI figures only; does not rewrite the ledger. */
export function AdminCurrencyToggle({
  current,
  className,
  compact = false,
  onChanged,
}: AdminCurrencyToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<DisplayCurrency>(current);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(current);
  }, [current]);

  async function choose(currency: DisplayCurrency) {
    if (currency === value || pending) return;
    setError("");
    const previous = value;
    setValue(currency);

    try {
      const res = await fetch("/api/user/display-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      onChanged?.(currency);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setValue(previous);
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-0.5",
          compact && "rounded-lg"
        )}
        role="group"
        aria-label="Admin display currency"
      >
        {!compact && (
          <span className="flex items-center gap-1 pl-2 pr-1 text-[10px] uppercase tracking-wide text-zinc-500">
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin text-amber-300" />
            ) : (
              <Coins className="h-3 w-3 text-amber-300" />
            )}
            Display
          </span>
        )}
        {OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={pending}
              onClick={() => choose(opt.id)}
              title={opt.label}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                compact && "px-2 py-1 text-[11px]",
                active
                  ? "bg-amber-500/20 text-amber-100 border border-amber-500/30"
                  : "text-zinc-400 hover:text-white border border-transparent"
              )}
            >
              {compact ? opt.short : opt.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-[10px] text-red-400 max-w-[12rem] text-right">{error}</p>}
    </div>
  );
}
