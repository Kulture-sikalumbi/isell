"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearSessionHint,
  loadSessionHint,
  saveSessionHint,
  type ClientSessionHint,
} from "@/lib/client-session";
import { offlineAwareFetch } from "@/lib/offline-fetch";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface ConnectivityContextValue {
  isOnline: boolean;
  sessionHint: ClientSessionHint | null;
  refreshSession: () => Promise<void>;
  wasLoggedIn: boolean;
}

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const [sessionHint, setSessionHint] = useState<ClientSessionHint | null>(null);

  const refreshSession = useCallback(async () => {
    if (!isOnline) {
      const cached = loadSessionHint();
      if (cached) setSessionHint(cached);
      return;
    }

    try {
      const res = await offlineAwareFetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();

      if (data.loggedIn) {
        const hint = {
          loggedIn: true as const,
          email: data.email as string | undefined,
          name: data.name as string | undefined,
        };
        saveSessionHint(hint);
        setSessionHint({ ...hint, cachedAt: Date.now() });
      } else {
        clearSessionHint();
        setSessionHint(null);
      }
    } catch {
      const cached = loadSessionHint();
      if (cached?.loggedIn) {
        setSessionHint(cached);
      }
    }
  }, [isOnline]);

  useEffect(() => {
    const cached = loadSessionHint();
    if (cached) setSessionHint(cached);
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (isOnline) {
      refreshSession();
    }
  }, [isOnline, refreshSession]);

  const value = useMemo(
    () => ({
      isOnline,
      sessionHint,
      refreshSession,
      wasLoggedIn: Boolean(sessionHint?.loggedIn),
    }),
    [isOnline, sessionHint, refreshSession]
  );

  return (
    <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error("useConnectivity must be used within ConnectivityProvider");
  }
  return ctx;
}

export function useConnectivityOptional() {
  return useContext(ConnectivityContext);
}
