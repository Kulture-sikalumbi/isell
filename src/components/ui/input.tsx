import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  variant?: "default" | "emphasized";
}

export function Input({
  label,
  hint,
  className,
  id,
  variant = "default",
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "block text-sm font-medium",
            variant === "emphasized" ? "text-white font-semibold" : "text-zinc-300"
          )}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl px-4 py-3 text-sm text-white transition-colors",
          variant === "emphasized"
            ? "border-2 border-cyan-400/55 bg-zinc-950/90 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)] placeholder:text-zinc-400 focus:border-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/25"
            : "border border-white/10 bg-white/5 placeholder:text-zinc-500 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/20",
          className
        )}
        {...props}
      />
      {hint && (
        <p className={cn("text-xs", variant === "emphasized" ? "text-zinc-400" : "text-zinc-500")}>
          {hint}
        </p>
      )}
    </div>
  );
}
