"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeToTables, subscribeToWallet } from "@/lib/realtime";
import { offlineAwareFetch } from "@/lib/offline-fetch";
import { convertCurrency, resolveDisplayCurrency } from "@/lib/format-currency";

const WALLET_POLL_MS = 20_000;

export function useLiveWalletBalance(
  userId: string | undefined,
  initialBalance: number,
  initialCurrency?: string,
  options?: {
    nativeCurrency?: string | null;
    fxRate?: number | null;
  }
) {
  const displayCurrency = resolveDisplayCurrency(initialCurrency);
  const [balance, setBalance] = useState(initialBalance);
  const [justUpdated, setJustUpdated] = useState(false);
  const [nativeCurrency, setNativeCurrency] = useState(
    resolveDisplayCurrency(options?.nativeCurrency || initialCurrency)
  );
  const [fxRate, setFxRate] = useState<number | null>(options?.fxRate ?? null);
  const prevBalance = useRef(initialBalance);

  useEffect(() => {
    setBalance(initialBalance);
    prevBalance.current = initialBalance;
    setNativeCurrency(resolveDisplayCurrency(options?.nativeCurrency || initialCurrency));
    setFxRate(options?.fxRate ?? null);
  }, [initialBalance, initialCurrency, options?.nativeCurrency, options?.fxRate]);

  const applyDisplayBalance = useCallback((next: number) => {
    setBalance(next);
    if (next !== prevBalance.current) {
      prevBalance.current = next;
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 2000);
    }
  }, []);

  const applyNativeBalance = useCallback(
    (nativeBalance: number, fromCurrency: string, rate: number | null) => {
      const converted = convertCurrency(
        nativeBalance,
        fromCurrency,
        displayCurrency,
        rate
      );
      applyDisplayBalance(converted);
    },
    [applyDisplayBalance, displayCurrency]
  );

  const fetchBalance = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await offlineAwareFetch("/api/wallet", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.displayBalance === "number") {
        if (typeof data.nativeCurrency === "string") {
          setNativeCurrency(resolveDisplayCurrency(data.nativeCurrency));
        }
        if (data.fxRate === null || typeof data.fxRate === "number") {
          setFxRate(data.fxRate ?? null);
        }
        applyDisplayBalance(Number(data.displayBalance));
        return;
      }
      // Back-compat fallback
      applyDisplayBalance(Number(data.wallet?.balance ?? 0));
    } catch {
      /* ignore */
    }
  }, [userId, applyDisplayBalance]);

  useEffect(() => {
    if (!userId) return;

    const initialFetch = setTimeout(() => {
      void fetchBalance();
    }, 0);

    const unsubWallet = subscribeToWallet(userId, (row) => {
      const fromCurrency = resolveDisplayCurrency(row.currency || nativeCurrency);
      applyNativeBalance(Number(row.balance), fromCurrency, fxRate);
    });

    const unsubTables = subscribeToTables(
      `wallet-live:${userId}`,
      ["user_wallets", "wallet_deposits", "wallet_transactions"],
      fetchBalance
    );

    const interval = setInterval(fetchBalance, WALLET_POLL_MS);

    return () => {
      clearTimeout(initialFetch);
      unsubWallet?.();
      unsubTables?.();
      clearInterval(interval);
    };
  }, [userId, fetchBalance, applyNativeBalance, nativeCurrency, fxRate]);

  return { balance, currency: displayCurrency, justUpdated, refresh: fetchBalance };
}
