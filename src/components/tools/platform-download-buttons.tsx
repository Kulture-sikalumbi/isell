import Link from "next/link";
import { Download, Monitor, Apple } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformDownloadButtonsProps {
  windowsUrl?: string | null;
  macUrl?: string | null;
  className?: string;
  size?: "sm" | "md";
  requireSignIn?: boolean;
  signInHref?: string;
}

export function PlatformDownloadButtons({
  windowsUrl,
  macUrl,
  className,
  size = "md",
  requireSignIn,
  signInHref = "/auth/login",
}: PlatformDownloadButtonsProps) {
  const win = windowsUrl?.trim();
  const mac = macUrl?.trim();
  if (!win && !mac) return null;

  const btnClass = cn(
    "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 font-medium text-white hover:bg-white/10 transition-colors",
    size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
  );

  function DownloadBtn({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: typeof Monitor;
  }) {
    if (requireSignIn) {
      return (
        <Link href={signInHref} className={btnClass}>
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={btnClass}>
        <Icon className="h-4 w-4" />
        {label}
      </a>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {win && (
        <DownloadBtn href={win} label="Windows" icon={Monitor} />
      )}
      {mac && (
        <DownloadBtn href={mac} label="Mac" icon={Apple} />
      )}
      {!win && !mac ? null : (
        <span className="sr-only">Free tool downloads</span>
      )}
    </div>
  );
}

/** Compact row with download icon label */
export function PlatformDownloadLinks({
  windowsUrl,
  macUrl,
}: {
  windowsUrl?: string | null;
  macUrl?: string | null;
}) {
  const win = windowsUrl?.trim();
  const mac = macUrl?.trim();
  if (!win && !mac) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
      <Download className="h-3.5 w-3.5 text-cyan-400" />
      {win && (
        <a href={win} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-300">
          Windows
        </a>
      )}
      {mac && (
        <a href={mac} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-300">
          Mac
        </a>
      )}
    </div>
  );
}
