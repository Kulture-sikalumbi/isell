"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

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
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = useCallback(() => setIsNavigating(true), []);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;

      const path = href.split("?")[0];
      const current = pathname;
      if (path !== current && path.startsWith("/")) {
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
