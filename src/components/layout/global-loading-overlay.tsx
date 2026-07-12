"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { IPhoneSpinner } from "@/components/ui/iphone-spinner";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";

interface GlobalLoadingOverlayProps {
  visible: boolean;
}

export function GlobalLoadingOverlay({ visible }: GlobalLoadingOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    return acquireBodyScrollLock();
  }, [visible]);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 backdrop-blur-[3px] pointer-events-auto"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-[#0f1016]/95 px-10 py-10 shadow-2xl shadow-black/50 min-w-[140px]">
        <div className="flex h-12 w-12 items-center justify-center">
          <IPhoneSpinner size="lg" />
        </div>
        <p className="text-sm font-medium text-zinc-300">Please wait…</p>
      </div>
    </div>,
    document.body
  );
}
