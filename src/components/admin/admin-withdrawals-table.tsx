"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { depositMethodLabel } from "@/lib/deposit-methods";
import type { WalletWithdrawal } from "@/types/database";

interface AdminWithdrawalsTableProps {
  initialWithdrawals: (WalletWithdrawal & {
    profile?: { email: string; full_name: string | null };
  })[];
}

export function AdminWithdrawalsTable({ initialWithdrawals }: AdminWithdrawalsTableProps) {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleAction(id: string, action: "complete" | "reject") {
    setLoadingId(id);
    setError("");

    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      setWithdrawals((prev) => prev.filter((w) => w.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoadingId(null);
    }
  }

  if (withdrawals.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-zinc-500">
        No pending withdrawals. New requests appear when customers cash out wallet balance.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="glass rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-white/5 text-left text-zinc-500">
              <th className="px-6 py-4 font-medium">Customer</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Payout to</th>
              <th className="px-6 py-4 font-medium">Reference</th>
              <th className="px-6 py-4 font-medium">Requested</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => {
              const snap = w.payment_method_snapshot;
              return (
                <tr key={w.id} className="border-b border-white/5 last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">
                      {w.profile?.full_name || w.profile?.email || "—"}
                    </p>
                    {w.profile?.email && w.profile.full_name && (
                      <p className="text-xs text-zinc-500">{w.profile.email}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-violet-300 font-medium">
                    {formatCurrency(w.amount, w.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="info">{depositMethodLabel(snap.method)}</Badge>
                    <p className="font-mono text-xs text-zinc-300 mt-1 break-all">
                      {snap.account_identifier}
                    </p>
                    {snap.account_name && (
                      <p className="text-xs text-zinc-500 mt-0.5">{snap.account_name}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-300">{w.reference}</td>
                  <td className="px-6 py-4 text-zinc-400">{formatDate(w.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(w.id, "complete")}
                        disabled={loadingId === w.id}
                      >
                        {loadingId === w.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Sent
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAction(w.id, "reject")}
                        disabled={loadingId === w.id}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        Mark <strong className="text-zinc-400">Sent</strong> only after you have transferred funds
        to the customer&apos;s payout account. This debits their wallet balance.
      </p>
    </div>
  );
}
