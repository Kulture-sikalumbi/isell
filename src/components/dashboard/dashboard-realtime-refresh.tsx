"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { subscribeToTables } from "@/lib/realtime";

const DASHBOARD_POLL_MS = 25_000;

interface DashboardRealtimeRefreshProps {
  userId: string;
}

/** Refresh dashboard when wallet, deposits, activations, or inbox change. */
export function DashboardRealtimeRefresh({ userId }: DashboardRealtimeRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const supabaseTables = [
      "user_wallets",
      "wallet_deposits",
      "wallet_transactions",
      "activations",
      "payments",
      "user_notifications",
    ];

    let timeout: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => router.refresh(), 400);
    };

    const unsub = subscribeToTables(`dashboard:${userId}`, supabaseTables, refresh);
    const interval = setInterval(refresh, DASHBOARD_POLL_MS);

    return () => {
      unsub?.();
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [userId, router]);

  return null;
}
