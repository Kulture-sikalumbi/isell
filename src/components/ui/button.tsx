import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:brightness-110",
  secondary: "glass text-foreground hover:border-cyan-400/30",
  ghost: "text-zinc-400 hover:text-white hover:bg-white/5",
  danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3.5 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  loading = false,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200",
        "active:scale-[0.97] touch-manipulation",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        loading && "relative",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading && <Spinner size="sm" className="shrink-0" />}
      <span className={cn(loading && "opacity-90")}>{children}</span>
    </button>
  );
}
