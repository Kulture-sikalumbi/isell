"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DEPOSIT_METHOD_LABELS } from "@/lib/deposit-methods";
import type { WalletDeposit } from "@/types/database";

interface AdminPendingDepositsPanelProps {
  deposits: (WalletDeposit & {
    profile?: { email: string; full_name: string | null };
  })[];
  compact?: boolean;
}

const methodLabels = DEPOSIT_METHOD_LABELS;

export function AdminPendingDepositsPanel({
  deposits: initialDeposits,
  compact = false,
}: AdminPendingDepositsPanelProps) {
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

  if (deposits.length === 0) return null;

  const shown = compact ? deposits.slice(0, 5) : deposits;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Pending deposits
            <Badge variant="warning" className="ml-2">
              {deposits.length}
            </Badge>
          </h2>
          <p className="text-sm text-zinc-500">
            Verify mobile money on your phone, then confirm with one click.
          </p>
        </div>
        {compact && deposits.length > 0 && (
          <Link href="/admin/deposits">
            <Button variant="secondary" size="sm">
              View all
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {shown.map((d) => (
          <div
            key={d.id}
            className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-white">
                {d.profile?.full_name || d.profile?.email || "Customer"}
                <span className="text-emerald-400 ml-2">
                  {formatCurrency(d.amount, d.currency)}
                </span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {methodLabels[d.method]}
                {d.transaction_id ? (
                  <> · TID <span className="font-mono text-zinc-400">{d.transaction_id}</span></>
                ) : (
                  <span className="text-amber-400"> · Awaiting TID</span>
                )}
              </p>
              {(d.sender_phone || d.sender_name) && (
                <p className="text-xs text-zinc-500 mt-1">
                  {d.sender_name && <span>{d.sender_name}</span>}
                  {d.sender_phone && (
                    <span className="font-mono text-zinc-400 ml-1">{d.sender_phone}</span>
                  )}
                </p>
              )}
              <p className="text-[10px] font-mono text-zinc-600 mt-1">
                {d.reference} · {formatDate(d.created_at)}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
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
                    Confirm deposit
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
          </div>
        ))}
      </div>
    </div>
  );
}
