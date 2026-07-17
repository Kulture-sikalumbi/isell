"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyableValue } from "@/components/ui/copyable-value";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DEPOSIT_METHOD_LABELS } from "@/lib/deposit-methods";
import type { WalletDeposit } from "@/types/database";

interface AdminDepositsTableProps {
  initialDeposits: (WalletDeposit & {
    profile?: { email: string; full_name: string | null };
  })[];
}

const methodLabels = DEPOSIT_METHOD_LABELS;

export function AdminDepositsTable({ initialDeposits }: AdminDepositsTableProps) {
  const router = useRouter();
  const [deposits, setDeposits] = useState(initialDeposits);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleAction(id: string, action: "confirm" | "reject") {
    setLoadingId(id);
    setError("");

    try {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      setDeposits((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoadingId(null);
    }
  }

  if (deposits.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-zinc-500">
        No pending deposits. New requests appear when customers submit wallet top-ups.
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
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-white/5 text-left text-zinc-500">
              <th className="px-6 py-4 font-medium">Customer</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Method</th>
              <th className="px-6 py-4 font-medium">TID</th>
              <th className="px-6 py-4 font-medium">Reference</th>
              <th className="px-6 py-4 font-medium">Submitted</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((d) => (
              <tr key={d.id} className="border-b border-white/5 last:border-0">
                <td className="px-6 py-4">
                  <p className="font-medium text-white">
                    {d.profile?.full_name || d.profile?.email || "—"}
                  </p>
                  {d.profile?.email && d.profile.full_name && (
                    <CopyableValue
                      value={d.profile.email}
                      className="mt-1"
                      valueClassName="text-xs text-zinc-500"
                      buttonClassName="py-0.5"
                      title="Copy customer email"
                    />
                  )}
                </td>
                <td className="px-6 py-4 text-emerald-400 font-medium">
                  {formatCurrency(d.amount, d.currency)}
                </td>
                <td className="px-6 py-4">
                  <Badge variant="info">{methodLabels[d.method]}</Badge>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-zinc-300">
                  {d.transaction_id ? (
                    <CopyableValue
                      value={d.transaction_id}
                      valueClassName="font-mono text-xs text-zinc-300"
                      buttonClassName="py-0.5"
                      title="Copy transaction ID"
                    />
                  ) : (
                    <span className="text-amber-400">Awaiting customer</span>
                  )}
                  {(d.sender_phone || d.sender_name) && (
                    <div className="mt-1 space-y-1 normal-case">
                      {d.sender_name && (
                        <CopyableValue
                          value={d.sender_name}
                          valueClassName="text-xs text-zinc-500"
                          buttonClassName="py-0.5"
                          title="Copy sender name"
                        />
                      )}
                      {d.sender_phone && (
                        <CopyableValue
                          value={d.sender_phone}
                          valueClassName="font-mono text-xs text-zinc-400"
                          buttonClassName="py-0.5"
                          title="Copy sender phone"
                        />
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                  <CopyableValue
                    value={d.reference}
                    valueClassName="font-mono text-xs text-zinc-400"
                    buttonClassName="py-0.5"
                    title="Copy deposit reference"
                  />
                </td>
                <td className="px-6 py-4 text-zinc-500">{formatDate(d.created_at)}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={loadingId === d.id || !d.transaction_id}
                      onClick={() => handleAction(d.id, "confirm")}
                      title={!d.transaction_id ? "Customer has not submitted TID yet" : undefined}
                    >
                      {loadingId === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Confirm
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={loadingId === d.id}
                      onClick={() => handleAction(d.id, "reject")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
