"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeToTables, subscribeToWallet } from "@/lib/realtime";
import { getSiteCurrency } from "@/lib/currency";

const WALLET_POLL_MS = 20_000;

export function useLiveWalletBalance(
  userId: string | undefined,
  initialBalance: number,
  _initialCurrency?: string
) {
  const displayCurrency = getSiteCurrency();
  const [balance, setBalance] = useState(initialBalance);
  const [justUpdated, setJustUpdated] = useState(false);
  const prevBalance = useRef(initialBalance);

  const applyBalance = useCallback((next: number) => {
    setBalance(next);
    if (next !== prevBalance.current) {
      prevBalance.current = next;
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 2000);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      applyBalance(Number(data.wallet?.balance ?? 0));
    } catch {
      /* ignore */
    }
  }, [userId, applyBalance]);

  useEffect(() => {
    setBalance(initialBalance);
    prevBalance.current = initialBalance;
  }, [initialBalance]);

  useEffect(() => {
    if (!userId) return;

    fetchBalance();

    const unsubWallet = subscribeToWallet(userId, (row) => {
      applyBalance(row.balance);
    });

    const unsubTables = subscribeToTables(
      `wallet-live:${userId}`,
      ["user_wallets", "wallet_deposits", "wallet_transactions"],
      fetchBalance
    );

    const interval = setInterval(fetchBalance, WALLET_POLL_MS);

    return () => {
      unsubWallet?.();
      unsubTables?.();
      clearInterval(interval);
    };
  }, [userId, fetchBalance, applyBalance]);

  return { balance, currency: displayCurrency, justUpdated, refresh: fetchBalance };
}
