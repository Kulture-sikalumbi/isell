import { cn } from "@/lib/utils";
import { AppleIcon } from "@/components/brand/apple-icon";

interface BrandWordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Wordmark: iS + Apple mark + ll Unlocks
 * Override mark with NEXT_PUBLIC_BRAND_MARK_URL if needed.
 */
export function BrandWordmark({ className, size = "md" }: BrandWordmarkProps) {
  const customMark = process.env.NEXT_PUBLIC_BRAND_MARK_URL;
  const sizes = {
    sm: { text: "text-sm", mark: "h-[0.85em] w-[0.85em]", gap: "gap-0" },
    md: { text: "text-lg sm:text-xl", mark: "h-[0.9em] w-[0.9em]", gap: "gap-0" },
    lg: { text: "text-3xl sm:text-4xl", mark: "h-[0.92em] w-[0.92em]", gap: "gap-0" },
  };
  const s = sizes[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold tracking-tight text-white whitespace-nowrap",
        s.text,
        s.gap,
        className
      )}
      aria-label="iSell Unlocks"
    >
      <span>iS</span>
      {customMark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={customMark}
          alt=""
          className={cn("inline-block object-contain mx-[0.02em]", s.mark)}
        />
      ) : (
        <AppleIcon className={cn("inline-block mx-[0.04em]", s.mark)} />
      )}
      <span>ll Unlocks</span>
    </span>
  );
}
