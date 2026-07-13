"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { getClientDisplayCurrency } from "@/lib/format-currency";
import { convertToolAmount, normalizePriceCurrency } from "@/lib/tool-pricing";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ToolPriceProps {
  amount: number;
  /** Currency stored in the database for this price — never the user's display preference alone. */
  priceCurrency?: string;
  currency?: string;
  fxRate?: number | null;
  isLoggedIn: boolean;
  loginNext?: string;
  className?: string;
  hintClassName?: string;
  variant?: "inline" | "badge" | "large";
}

export function ToolPrice({
  amount,
  priceCurrency = "ZMW",
  currency,
  fxRate,
  isLoggedIn,
  loginNext = "/tools",
  className,
  hintClassName,
  variant = "inline",
}: ToolPriceProps) {
  const displayCurrency = (currency ?? getClientDisplayCurrency()).toUpperCase();
  const displayAmount = convertToolAmount(
    amount,
    normalizePriceCurrency(priceCurrency),
    displayCurrency,
    fxRate ?? undefined
  );
  const loginHref = `/auth/login?next=${encodeURIComponent(loginNext)}`;

  if (!isLoggedIn) {
    if (variant === "badge") {
      return (
        <Link
          href={loginHref}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-500/15 transition-colors",
            className
          )}
        >
          <LogIn className="h-3 w-3" />
          Sign in for price
        </Link>
      );
    }

    return (
      <Link
        href={loginHref}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors",
          hintClassName,
          className
        )}
      >
        <LogIn className="h-3.5 w-3.5 shrink-0" />
        Sign in to see price
      </Link>
    );
  }

  if (variant === "large") {
    return (
      <span className={cn("text-2xl font-bold text-white", className)}>
        {formatCurrency(displayAmount, displayCurrency)}
      </span>
    );
  }

  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 font-semibold",
          className
        )}
      >
        {formatCurrency(displayAmount, displayCurrency)}
      </span>
    );
  }

  return (
    <span className={cn("text-xl font-bold text-white", className)}>
      {formatCurrency(displayAmount, displayCurrency)}
    </span>
  );
}
