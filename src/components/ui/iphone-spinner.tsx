import { cn } from "@/lib/utils";

interface IPhoneSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: 28,
  md: 36,
  lg: 48,
};

/** iOS-style activity indicator — 12 fading bars via SVG (reliable across browsers). */
export function IPhoneSpinner({ size = "md", className }: IPhoneSpinnerProps) {
  const px = sizes[size];
  const bars = 12;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      className={cn("iphone-spinner-svg", className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <rect
          key={i}
          className="iphone-spinner-svg__bar"
          x="11"
          y="2"
          width="2"
          height="5"
          rx="1"
          fill="currentColor"
          transform={`rotate(${i * 30} 12 12)`}
          style={{ animationDelay: `${-1.1 + i * (1 / bars)}s` }}
        />
      ))}
    </svg>
  );
}
