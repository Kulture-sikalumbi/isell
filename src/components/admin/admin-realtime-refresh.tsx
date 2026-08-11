"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { subscribeToTables } from "@/lib/realtime";

const DEBOUNCE_MS = 3000;

const PAGE_TABLES: Record<string, string[]> = {
  "/admin/payments": ["payments", "activations"],
  "/admin/deposits": ["wallet_deposits"],
  "/admin/inbox": ["support_messages"],
  "/admin/messages": ["support_messages"],
  "/admin/ledger": ["ledger_entries"],
};

/** Refresh admin pages when operational data changes. */
export function AdminRealtimeRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastRefreshRef = useRef(0);

  const refresh = useCallback(() => {
    clearTimeout(timeoutRef.current);

    const elapsed = Date.now() - lastRefreshRef.current;
    const delay = Math.max(DEBOUNCE_MS - elapsed, 500);

    timeoutRef.current = setTimeout(() => {
      lastRefreshRef.current = Date.now();
      router.refresh();
    }, delay);
  }, [router]);

  useEffect(() => {
    const tables = PAGE_TABLES[pathname] ?? [
      "payments",
      "admin_notifications",
    ];

    const unsub = subscribeToTables("admin-refresh", tables, refresh);

    return () => {
      unsub?.();
      clearTimeout(timeoutRef.current);
    };
  }, [pathname, refresh]);

  return null;
}
