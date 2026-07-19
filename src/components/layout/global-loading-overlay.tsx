"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface GlobalLoadingOverlayProps {
  visible: boolean;
}

/**
 * Non-blocking top progress bar for navigations / actions.
 * Intentionally uses pointer-events-none so taps keep working —
 * a full-screen blocker made the UI feel stuck until multiple clicks.
 */
export function GlobalLoadingOverlay({ visible }: GlobalLoadingOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      className="fixed top-0 left-0 right-0 z-[300] pointer-events-none"
      aria-live="polite"
      aria-busy="true"
      role="progressbar"
    >
      <div className="h-[3px] w-full overflow-hidden bg-white/5">
        <div className="nav-progress-bar h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-cyan-400" />
      </div>
    </div>,
    document.body
  );
}
