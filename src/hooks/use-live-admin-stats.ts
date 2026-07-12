"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeToTables } from "@/lib/realtime";
import type { AdminAttentionCounts } from "@/types/admin-stats";

const empty: AdminAttentionCounts = {
  pendingDeposits: 0,
  pendingWithdrawals: 0,
  awaitingOrders: 0,
  unreadNotifications: 0,
  unreadMessages: 0,
  totalAttention: 0,
};

export function useLiveAdminStats(initial?: {
  merchantBalance?: number;
  merchantCurrency?: string;
  platformFees?: number;
}) {
  const [counts, setCounts] = useState<AdminAttentionCounts>(empty);
  const [merchantBalance, setMerchantBalance] = useState(initial?.merchantBalance ?? 0);
  const [merchantCurrency, setMerchantCurrency] = useState(initial?.merchantCurrency ?? "ZMW");
  const [platformFees, setPlatformFees] = useState(initial?.platformFees ?? 0);
  const [justUpdated, setJustUpdated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) return;
      const data = await res.json();
      setCounts({
        pendingDeposits: data.pendingDeposits ?? 0,
        pendingWithdrawals: data.pendingWithdrawals ?? 0,
        awaitingOrders: data.awaitingOrders ?? 0,
        unreadNotifications: data.unreadNotifications ?? 0,
        unreadMessages: data.unreadMessages ?? 0,
        totalAttention: data.totalAttention ?? 0,
      });
      if (typeof data.merchantBalance === "number") {
        setMerchantBalance(data.merchantBalance);
        setMerchantCurrency(data.merchantCurrency ?? "ZMW");
        setPlatformFees(data.platformFees ?? 0);
      }
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 1500);
    } catch {
      // ignore
    }
  }, []);

  const scheduleFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchStats, 300);
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();

    const unsub = subscribeToTables(
      "admin-stats",
      [
        "wallet_deposits",
        "wallet_withdrawals",
        "payments",
        "admin_notifications",
        "support_messages",
        "ledger_entries",
        "user_wallets",
        "user_notifications",
      ],
      scheduleFetch
    );

    return () => {
      unsub?.();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchStats, scheduleFetch]);

  return { counts, merchantBalance, merchantCurrency, platformFees, justUpdated, refresh: fetchStats };
}
