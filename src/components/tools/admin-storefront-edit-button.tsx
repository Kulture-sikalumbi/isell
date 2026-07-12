import Link from "next/link";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminStorefrontEditButtonProps {
  href: string;
  label: string;
  className?: string;
  size?: "sm" | "md";
}

export function AdminStorefrontEditButton({
  href,
  label,
  className,
  size = "md",
}: AdminStorefrontEditButtonProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const padding = size === "sm" ? "p-1.5" : "p-2";

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300",
        "hover:bg-amber-500/20 hover:text-amber-200 hover:border-amber-500/50 transition-colors",
        padding,
        className
      )}
    >
      <Pencil className={iconSize} />
    </Link>
  );
}
