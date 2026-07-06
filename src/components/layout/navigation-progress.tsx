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

const LOADING_SAFETY_MS = 12_000;

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

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const startLoading = useCallback(() => {
    setLoadingCount((c) => c + 1);
    clearSafetyTimer();
    safetyTimerRef.current = setTimeout(() => {
      setLoadingCount(0);
    }, LOADING_SAFETY_MS);
  }, [clearSafetyTimer]);

  const stopLoading = useCallback(() => {
    setLoadingCount((c) => Math.max(0, c - 1));
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
    setLoadingCount(0);
    clearSafetyTimer();
  }, [pathname, searchParams, clearSafetyTimer]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
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

    function handleSubmit() {
      startLoading();
    }

    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
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
