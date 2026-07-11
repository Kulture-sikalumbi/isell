import Link from "next/link";
import { LogIn } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ToolPriceProps {
  amount: number;
  currency?: string;
  isLoggedIn: boolean;
  loginNext?: string;
  className?: string;
  hintClassName?: string;
  variant?: "inline" | "badge" | "large";
}

export function ToolPrice({
  amount,
  currency,
  isLoggedIn,
  loginNext = "/tools",
  className,
  hintClassName,
  variant = "inline",
}: ToolPriceProps) {
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
        {formatCurrency(amount, currency)}
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
        {formatCurrency(amount, currency)}
      </span>
    );
  }

  return (
    <span className={cn("text-xl font-bold text-white", className)}>
      {formatCurrency(amount, currency)}
    </span>
  );
}
