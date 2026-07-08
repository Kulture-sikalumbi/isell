"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useConnectivityOptional } from "@/components/layout/connectivity-provider";
import { clearSessionHint } from "@/lib/client-session";
import { createClient } from "@/lib/supabase/client";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

function getIdleTimeoutMs(): number {
  const minutes = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES);
  const resolved = Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
  return resolved * 60 * 1000;
}

export function IdleSessionGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const connectivity = useConnectivityOptional();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signingOutRef = useRef(false);

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
  const isLoggedIn = Boolean(connectivity?.wasLoggedIn);

  const signOutIdle = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;

    const supabase = createClient();
    await supabase?.auth.signOut();
    clearSessionHint();
    router.replace("/auth/login?reason=session_expired");
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isProtected || !isLoggedIn) return;
    timerRef.current = setTimeout(signOutIdle, getIdleTimeoutMs());
  }, [isProtected, isLoggedIn, signOutIdle]);

  useEffect(() => {
    if (!isProtected || !isLoggedIn) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const;
    let lastMouseMove = 0;

    const onActivity = () => resetTimer();
    const onMouseMove = () => {
      const now = Date.now();
      if (now - lastMouseMove < 30_000) return;
      lastMouseMove = now;
      resetTimer();
    };

    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of events) {
        window.removeEventListener(event, onActivity);
      }
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [isProtected, isLoggedIn, resetTimer]);

  return null;
}
