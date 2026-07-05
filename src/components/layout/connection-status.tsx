"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useConnectivityOptional } from "@/components/layout/connectivity-provider";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export function ConnectionStatus({
  className,
  showLabel = true,
  compact = false,
}: ConnectionStatusProps) {
  const connectivity = useConnectivityOptional();
  const isOnline = connectivity?.isOnline ?? true;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        isOnline
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-200",
        compact && "px-2 py-0.5",
        className
      )}
      title={isOnline ? "Connected to the internet" : "No internet — actions are paused"}
    >
      {isOnline ? (
        <Wifi className={cn("shrink-0", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      ) : (
        <WifiOff className={cn("shrink-0 animate-pulse", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      )}
      {showLabel && (
        <span className={compact ? "hidden sm:inline" : undefined}>
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </div>
  );
}
