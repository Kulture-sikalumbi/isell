import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryLogoProps {
  iconUrl?: string | null;
  name: string;
  accentClass: string;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
}

export function CategoryLogo({
  iconUrl,
  name,
  accentClass,
  className = "h-14 w-14",
  iconClassName = "h-6 w-6 text-white/85",
  imageClassName = "h-9 w-9 rounded-lg object-cover",
}: CategoryLogoProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br border border-white/10",
        accentClass,
        className
      )}
    >
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt={name} className={imageClassName} />
      ) : (
        <Layers className={iconClassName} />
      )}
    </div>
  );
}
