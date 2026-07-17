"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyableValueProps {
  value: string;
  displayValue?: string;
  className?: string;
  valueClassName?: string;
  buttonClassName?: string;
  title?: string;
}

export function CopyableValue({
  value,
  displayValue,
  className,
  valueClassName,
  buttonClassName,
  title,
}: CopyableValueProps) {
  const [copied, setCopied] = useState(false);
  const trimmedValue = value.trim();

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    if (!trimmedValue) return;
    await navigator.clipboard.writeText(trimmedValue);
    setCopied(true);
  }

  return (
    <div className={cn("flex items-start gap-2 min-w-0", className)}>
      <span className={cn("min-w-0 break-all", valueClassName)}>{displayValue ?? trimmedValue}</span>
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={!trimmedValue}
        title={title ?? "Copy"}
        aria-label={copied ? "Copied" : "Copy value"}
        className={cn(
          "shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40",
          buttonClassName
        )}
      >
        <span className="inline-flex items-center gap-1">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
    </div>
  );
}
