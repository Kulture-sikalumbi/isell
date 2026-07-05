"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, createContext, useCallback, useContext, useEffect, useState } from "react";

interface NavigationContextValue {
  isNavigating: boolean;
  startNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  isNavigating: false,
  startNavigation: () => {},
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
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = useCallback(() => setIsNavigating(true), []);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;

      const url = new URL(href, window.location.origin);
      const nextPath = url.pathname;
      const nextSearch = url.search;
      const currentSearch = window.location.search;

      if (nextPath !== pathname || nextSearch !== currentSearch) {
        setIsNavigating(true);
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  return (
    <NavigationContext.Provider value={{ isNavigating, startNavigation }}>
      <div
        className={`nav-progress-bar ${isNavigating ? "nav-progress-bar--active" : ""}`}
        aria-hidden
      />
      {children}
    </NavigationContext.Provider>
  );
}
