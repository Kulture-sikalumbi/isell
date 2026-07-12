"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DEPOSIT_METHOD_LABELS } from "@/lib/deposit-methods";
import type { WalletDeposit, WalletTransaction } from "@/types/database";

const methodLabels = DEPOSIT_METHOD_LABELS;

const typeLabels: Record<string, string> = {
  deposit: "Deposit",
  purchase: "Purchase",
  platform_fee: "Service fee",
  refund: "Refund",
  adjustment: "Adjustment",
  withdrawal: "Withdrawal",
};

function PendingDepositRow({ deposit }: { deposit: WalletDeposit }) {
  return (
    <div className="px-5 py-3.5 flex items-start justify-between gap-3 bg-cyan-500/[0.04]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <p className="text-sm font-medium text-white">
            Deposit · {formatCurrency(deposit.amount, deposit.currency)}
          </p>
          <Badge variant="info">Awaiting verification</Badge>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {methodLabels[deposit.method]} · {formatDate(deposit.created_at)}
        </p>
        {deposit.transaction_id && (
          <p className="text-[11px] text-zinc-600 mt-1 font-mono truncate">
            TID {deposit.transaction_id}
          </p>
        )}
      </div>
      <p className="text-xs text-zinc-500 font-mono shrink-0">{deposit.reference}</p>
    </div>
  );
}

function RejectedDepositRow({ deposit }: { deposit: WalletDeposit }) {
  return (
    <div className="px-5 py-3.5 flex items-start justify-between gap-3 bg-red-500/[0.03]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <p className="text-sm font-medium text-white">
            Deposit · {formatCurrency(deposit.amount, deposit.currency)}
          </p>
          <Badge variant="danger">Rejected</Badge>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {methodLabels[deposit.method]} · {formatDate(deposit.created_at)}
        </p>
        <p className="text-xs text-red-300/80 mt-1">
          {deposit.admin_note || "Not credited — contact admin if this is a mistake."}
        </p>
      </div>
      <p className="text-xs text-zinc-600 font-mono shrink-0">{deposit.reference}</p>
    </div>
  );
}

export function WalletHistoryList() {
  const [pendingDeposits, setPendingDeposits] = useState<WalletDeposit[]>([]);
  const [rejectedDeposits, setRejectedDeposits] = useState<WalletDeposit[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (before?: string | null) => {
    const isMore = Boolean(before);
    if (isMore) setLoadingMore(true);
    else setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ limit: "15" });
      if (before) params.set("before", before);

      const res = await fetch(`/api/wallet/history?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");

      if (isMore) {
        setTransactions((prev) => [...prev, ...(data.transactions ?? [])]);
      } else {
        setPendingDeposits(data.pendingDeposits ?? []);
        setRejectedDeposits(data.rejectedDeposits ?? []);
        setTransactions(data.transactions ?? []);
      }
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !nextCursor || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor && !loadingMore) {
          loadPage(nextCursor);
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, loadPage]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-sm text-red-400">{error}</div>
    );
  }

  const hasContent =
    pendingDeposits.length > 0 ||
    rejectedDeposits.length > 0 ||
    transactions.length > 0;

  if (!hasContent) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <p className="text-sm text-zinc-400 mb-2">No transactions yet</p>
        <p className="text-xs text-zinc-600 mb-4">Deposits and purchases will show up here.</p>
        <Link
          href="/dashboard?tab=wallet"
          className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
        >
          Add wallet funds
        </Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/10">
      {pendingDeposits.length > 0 && (
        <>
          <div className="px-5 py-3 border-b border-white/5 bg-cyan-500/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">
              Awaiting verification
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {pendingDeposits.map((d) => (
              <PendingDepositRow key={`pending-${d.id}`} deposit={d} />
            ))}
          </div>
        </>
      )}

      {rejectedDeposits.length > 0 && (
        <>
          <div className="px-5 py-3 border-b border-white/5 bg-red-500/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-300/90">
              Rejected deposits
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {rejectedDeposits.map((d) => (
              <RejectedDepositRow key={`rejected-${d.id}`} deposit={d} />
            ))}
          </div>
        </>
      )}

      {transactions.length > 0 && (
        <>
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Activity
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {transactions.map((tx) => {
              const isCredit = tx.amount > 0;
              return (
                <div
                  key={`tx-${tx.id}`}
                  className="px-5 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      {typeLabels[tx.type] ?? tx.type}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                      {tx.description ?? "—"} · {formatDate(tx.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        isCredit ? "text-emerald-400" : "text-zinc-300"
                      }`}
                    >
                      {isCredit ? "+" : ""}
                      {formatCurrency(tx.amount, tx.currency)}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      Bal {formatCurrency(tx.balance_after, tx.currency)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div ref={sentinelRef} className="px-5 py-4 flex justify-center min-h-[3rem] border-t border-white/5">
        {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />}
        {!loadingMore && !nextCursor && transactions.length > 0 && (
          <p className="text-xs text-zinc-600">End of history</p>
        )}
      </div>
    </div>
  );
}
