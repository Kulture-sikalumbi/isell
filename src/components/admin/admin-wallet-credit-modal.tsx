"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminWalletCreditModalProps {
  userId: string;
  email: string;
  fullName?: string | null;
  walletCurrency?: string | null;
  walletBalance?: number;
}

export function AdminWalletCreditModal({
  userId,
  email,
  fullName,
  walletCurrency = "ZMW",
  walletBalance = 0,
}: AdminWalletCreditModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState((walletCurrency || "ZMW").toUpperCase());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to credit wallet");
      setSuccess(
        `Wallet credited successfully.\nPrevious balance: ${data.currency} ${Number(data.previousBalance ?? 0).toFixed(2)}\nNew balance: ${data.currency} ${Number(data.balance ?? 0).toFixed(2)}`
      );
      setAmount("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to credit wallet");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
        {open ? "Close top-up" : "Top up wallet"}
      </Button>

      {open && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3 max-w-md">
          <div>
            <p className="text-sm font-medium text-white">Admin wallet top-up</p>
            <p className="text-xs text-zinc-400 mt-1">
              Credit funds directly after you confirm this customer has already paid.
            </p>
          </div>

          <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2 text-xs text-zinc-300">
            <div>{fullName || "Customer"}</div>
            <div className="text-zinc-500 mt-0.5">{email}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="info">Wallet currency: {currency}</Badge>
              <Badge variant="success">Current balance: {currency} {walletBalance.toFixed(2)}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
            >
              <option value={walletCurrency?.toUpperCase() || "ZMW"}>{walletCurrency?.toUpperCase() || "ZMW"}</option>
            </select>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Why are you crediting this wallet? Example: customer paid via MTN, deposit flow failed."
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none resize-y"
          />
          <p className="text-[11px] text-zinc-500">
            This creates a wallet adjustment entry so the manual credit is traceable later.
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400 whitespace-pre-line">{success}</p>}

          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={saving || !amount.trim()}>
              {saving ? "Crediting…" : "Credit wallet"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
