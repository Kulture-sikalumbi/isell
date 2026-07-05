"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { subscribeToTables } from "@/lib/realtime";

/** Refresh admin pages when operational data changes. */
export function AdminRealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => router.refresh(), 500);
    };

    const unsub = subscribeToTables(
      "admin-refresh",
      [
        "wallet_deposits",
        "payments",
        "admin_notifications",
        "support_messages",
        "activations",
        "ledger_entries",
      ],
      refresh
    );

    return () => {
      unsub?.();
      clearTimeout(timeout);
    };
  }, [router]);

  return null;
}
