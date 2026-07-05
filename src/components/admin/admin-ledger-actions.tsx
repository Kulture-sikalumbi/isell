"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminLedgerActionsProps {
  currency: string;
  trackedBalance: number;
}

export function AdminLedgerActions({ currency, trackedBalance }: AdminLedgerActionsProps) {
  const router = useRouter();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [phoneBalance, setPhoneBalance] = useState("");
  const [reconcileNote, setReconcileNote] = useState("");
  const [loading, setLoading] = useState<"withdraw" | "reconcile" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setLoading("withdraw");
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/ledger/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          note: withdrawNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdraw failed");

      setWithdrawAmount("");
      setWithdrawNote("");
      setMessage("Withdrawal recorded. Web merchant balance updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleReconcile(e: React.FormEvent) {
    e.preventDefault();
    setLoading("reconcile");
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/ledger/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_merchant_balance: Number(phoneBalance),
          note: reconcileNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reconciliation failed");

      setPhoneBalance("");
      setReconcileNote("");
      setMessage(
        data.matched
          ? "Balances match — no adjustment needed."
          : `Reconciliation complete. Web balance updated to match your merchant phone.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconciliation failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-100/90 space-y-2">
            <p className="font-medium text-amber-200">Keep your merchant phone and web ledger in sync</p>
            <ul className="list-disc pl-4 space-y-1 text-amber-100/75 text-xs sm:text-sm">
              <li>
                When a customer deposit is <strong>confirmed</strong>, money is credited to their
                wallet and added to this merchant ledger.
              </li>
              <li>
                When you <strong>withdraw cash</strong> from MTN/Airtel, record it here so the web
                balance matches your phone.
              </li>
              <li>
                Customer wallet balances are <strong>liabilities</strong> — prepaid credit you owe
                them for future tool purchases.
              </li>
              <li>
                Wallet purchases do not add new money to the merchant account — they only reduce
                customer prepaid balance.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={handleWithdraw} className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-white">Record merchant withdrawal</h3>
          <p className="text-xs text-zinc-500">
            Use this when you take money out of your MTN/Airtel merchant account. This only updates
            the web ledger — it does not move real money.
          </p>
          <Input
            label={`Amount (${currency})`}
            type="number"
            min="0.01"
            step="0.01"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            required
            placeholder="e.g. 100"
          />
          <Input
            label="Note (optional)"
            value={withdrawNote}
            onChange={(e) => setWithdrawNote(e.target.value)}
            placeholder="e.g. Paid developer, personal transfer"
          />
          <Button type="submit" disabled={loading === "withdraw"}>
            {loading === "withdraw" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              "Record withdrawal"
            )}
          </Button>
        </form>

        <form onSubmit={handleReconcile} className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-cyan-400" />
            <h3 className="font-semibold text-white">Reconcile with merchant phone</h3>
          </div>
          <p className="text-xs text-zinc-500">
            Check your MTN/Airtel balance on your phone and enter it below. If it differs from the
            web tracked balance ({currency} {trackedBalance.toFixed(2)}), we&apos;ll add an
            adjustment entry.
          </p>
          <Input
            label={`Balance on merchant phone (${currency})`}
            type="number"
            min="0"
            step="0.01"
            value={phoneBalance}
            onChange={(e) => setPhoneBalance(e.target.value)}
            required
            placeholder="Check your MoMo app"
          />
          <Input
            label="Note (optional)"
            value={reconcileNote}
            onChange={(e) => setReconcileNote(e.target.value)}
            placeholder="e.g. Weekly check — MTN line"
          />
          <Button type="submit" variant="secondary" disabled={loading === "reconcile"}>
            {loading === "reconcile" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              "Compare & sync"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
