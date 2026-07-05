"use client";

import { WifiOff } from "lucide-react";
import { useConnectivityOptional } from "@/components/layout/connectivity-provider";

export function OfflineBanner() {
  const connectivity = useConnectivityOptional();
  if (!connectivity || connectivity.isOnline) return null;

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-950/95 px-4 py-2 text-center text-sm text-amber-100 backdrop-blur-md"
        role="status"
      >
        <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
        <span>
          You&apos;re offline
          {connectivity.wasLoggedIn
            ? " — still signed in. Actions will resume when connection returns."
            : " — check your connection."}
        </span>
      </div>
      <div className="h-10 shrink-0" aria-hidden />
    </>
  );
}
