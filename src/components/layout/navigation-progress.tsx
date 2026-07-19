"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GlobalLoadingOverlay } from "@/components/layout/global-loading-overlay";

/** Clear stuck indicators quickly — never leave the UI feeling frozen. */
const LOADING_SAFETY_MS = 4_000;

interface NavigationContextValue {
  isLoading: boolean;
  /** @deprecated use startLoading */
  isNavigating: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  startNavigation: () => void;
  runWithLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

const NavigationContext = createContext<NavigationContextValue>({
  isLoading: false,
  isNavigating: false,
  startLoading: () => {},
  stopLoading: () => {},
  startNavigation: () => {},
  runWithLoading: async (fn) => fn(),
});

export function useNavigationLoading() {
  return useContext(NavigationContext);
}

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <NavigationProgressInner>{children}</NavigationProgressInner>
    </Suspense>
  );
}

function NavigationProgressInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loadingCount, setLoadingCount] = useState(0);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingCountRef = useRef(0);

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const armSafetyTimer = useCallback(() => {
    clearSafetyTimer();
    safetyTimerRef.current = setTimeout(() => {
      loadingCountRef.current = 0;
      setLoadingCount(0);
    }, LOADING_SAFETY_MS);
  }, [clearSafetyTimer]);

  const startLoading = useCallback(() => {
    // Avoid stacking: one visible indicator is enough (extra clicks used to
    // keep the blocker up longer via a rising count).
    if (loadingCountRef.current > 0) {
      armSafetyTimer();
      return;
    }
    loadingCountRef.current = 1;
    setLoadingCount(1);
    armSafetyTimer();
  }, [armSafetyTimer]);

  const stopLoading = useCallback(() => {
    loadingCountRef.current = 0;
    setLoadingCount(0);
    clearSafetyTimer();
  }, [clearSafetyTimer]);

  const startNavigation = startLoading;

  const runWithLoading = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      startLoading();
      try {
        return await fn();
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  const isLoading = loadingCount > 0;

  useEffect(() => {
    loadingCountRef.current = 0;
    setLoadingCount(0);
    clearSafetyTimer();
  }, [pathname, searchParams, clearSafetyTimer]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a");
      if (anchor) {
        const href = anchor.getAttribute("href");
        if (!href || href.startsWith("#") || anchor.target === "_blank") return;
        if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;
        if (anchor.hasAttribute("download")) return;

        const url = new URL(href, window.location.origin);
        const nextPath = url.pathname;
        const nextSearch = url.search;
        const currentSearch = window.location.search;

        if (nextPath !== pathname || nextSearch !== currentSearch) {
          startLoading();
        }
        return;
      }

      if (target.closest("[data-global-loading]")) {
        startLoading();
      }
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [pathname, startLoading]);

  const value = useMemo(
    () => ({
      isLoading,
      isNavigating: isLoading,
      startLoading,
      stopLoading,
      startNavigation,
      runWithLoading,
    }),
    [isLoading, startLoading, stopLoading, startNavigation, runWithLoading]
  );

  return (
    <NavigationContext.Provider value={value}>
      <GlobalLoadingOverlay visible={isLoading} />
      {children}
    </NavigationContext.Provider>
  );
}
