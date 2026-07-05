"use client";

import { useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { DepositMethod } from "@/types/database";

interface MerchantDetails {
  mtn: string;
  airtel: string;
  binance: string;
  currency: string;
}

interface DepositFormProps {
  merchants: MerchantDetails;
  currency: string;
}

const methods: { id: DepositMethod; label: string; key: keyof MerchantDetails }[] = [
  { id: "mtn", label: "MTN Mobile Money", key: "mtn" },
  { id: "airtel", label: "Airtel Money", key: "airtel" },
  { id: "binance", label: "Binance Pay", key: "binance" },
];

export function DepositForm({ merchants, currency }: DepositFormProps) {
  const [method, setMethod] = useState<DepositMethod>("mtn");
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ reference: string } | null>(null);

  const merchantNumber = merchants[method === "binance" ? "binance" : method === "airtel" ? "airtel" : "mtn"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          method,
          transaction_id: transactionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit deposit");

      setSuccess({ reference: data.deposit.reference });
      setAmount("");
      setTransactionId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-emerald-400 font-semibold mb-2">Deposit submitted</p>
        <p className="text-sm text-zinc-400 mb-4">
          Reference: <span className="font-mono text-white">{success.reference}</span>
        </p>
        <p className="text-sm text-zinc-500">
          Admin will verify your payment and credit your wallet, usually within a few hours.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={() => setSuccess(null)}
        >
          Add another deposit
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-sm text-zinc-400 mb-3">Payment method</p>
        <div className="grid sm:grid-cols-3 gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`rounded-xl border px-3 py-3 text-sm transition-colors ${
                method === m.id
                  ? "border-cyan-500/40 bg-cyan-500/10 text-white"
                  : "border-white/10 text-zinc-400 hover:border-white/20"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {merchantNumber ? (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Smartphone className="h-4 w-4 text-cyan-400" />
            Send payment to this merchant number
          </div>
          <p className="text-2xl font-mono font-bold text-white tracking-wide">
            {merchantNumber}
          </p>
          <p className="text-xs text-zinc-500">
            Use your reference in the payment note if your provider allows it.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
          Merchant number for {method} is not configured yet. Contact admin or try another method.
        </div>
      )}

      <Input
        label={`Amount (${currency})`}
        type="number"
        min="1"
        step="0.01"
        placeholder="e.g. 50"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <Input
        label="Transaction ID"
        placeholder="Paste the ID from your MTN/Airtel confirmation SMS"
        value={transactionId}
        onChange={(e) => setTransactionId(e.target.value)}
        required
        hint="Admin uses this to verify your payment on their phone"
      />

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading || !merchantNumber}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>Submit deposit for verification</>
        )}
      </Button>

      <p className="text-xs text-zinc-500 text-center">
        Minimum deposit recommended: {formatCurrency(10, currency)}. Funds appear after admin confirms.
      </p>
    </form>
  );
}
