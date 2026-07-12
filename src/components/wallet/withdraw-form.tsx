"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { ArrowDownToLine, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { depositMethodLabel, isMobileMoneyMethod, isZambiaWalletCurrency } from "@/lib/deposit-methods";
import {
  formatWithdrawalMinimum,
  getWithdrawalMinimum,
  withdrawalPolicyWithMinimum,
} from "@/lib/wallet-policy";
import { cn, formatCurrency } from "@/lib/utils";
import type { UserPaymentMethod, WalletWithdrawal } from "@/types/database";

interface WithdrawFormProps {
  balance: number;
  currency: string;
  paymentMethods: UserPaymentMethod[];
  pendingWithdrawal: WalletWithdrawal | null;
}

export function WithdrawForm({
  balance,
  currency,
  paymentMethods,
  pendingWithdrawal,
}: WithdrawFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const eligibleMethods = useMemo(
    () => paymentMethods.filter((m) => !isMobileMoneyMethod(m.method) || isZambiaWalletCurrency(currency)),
    [paymentMethods, currency]
  );
  const [paymentMethodId, setPaymentMethodId] = useState(
    eligibleMethods.find((m) => m.is_default)?.id ?? eligibleMethods[0]?.id ?? ""
  );

  useEffect(() => {
    if (!eligibleMethods.some((m) => m.id === paymentMethodId)) {
      setPaymentMethodId(
        eligibleMethods.find((m) => m.is_default)?.id ?? eligibleMethods[0]?.id ?? ""
      );
    }
  }, [eligibleMethods, paymentMethodId]);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<WalletWithdrawal | null>(null);

  const minimum = getWithdrawalMinimum(currency);
  const canWithdraw = balance >= minimum && eligibleMethods.length > 0 && !pendingWithdrawal;
  const selectedMethod = eligibleMethods.find((m) => m.id === paymentMethodId);
  const policyPoints = withdrawalPolicyWithMinimum(currency);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWithdraw || !policyAccepted) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          payment_method_id: paymentMethodId,
          policy_accepted: policyAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal request failed");

      setSuccess(data.withdrawal);
      setAmount("");
      setPolicyAccepted(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal request failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5 text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
        <p className="font-semibold text-white">Withdrawal requested</p>
        <Badge variant="warning">Awaiting admin processing</Badge>
        <p className="text-sm text-zinc-400">
          Reference <span className="font-mono text-white">{success.reference}</span>
        </p>
        <p className="text-xs text-zinc-500">
          We&apos;ll send {formatCurrency(success.amount, success.currency)} to your payout method
          after admin approves. You&apos;ll get an inbox notification.
        </p>
        <Button type="button" variant="secondary" onClick={() => setSuccess(null)}>
          Done
        </Button>
      </div>
    );
  }

  if (pendingWithdrawal) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
          <p className="font-medium text-amber-100">Withdrawal in progress</p>
        </div>
        <p className="text-sm text-zinc-400">
          {formatCurrency(pendingWithdrawal.amount, pendingWithdrawal.currency)} — ref{" "}
          <span className="font-mono text-white">{pendingWithdrawal.reference}</span>
        </p>
        <p className="text-xs text-zinc-500">
          Admin is processing your request. You can submit another withdrawal after this one is
          completed or declined.
        </p>
      </div>
    );
  }

  if (eligibleMethods.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-zinc-400">
        {isZambiaWalletCurrency(currency)
          ? "Add a payout method above before you can withdraw wallet funds to mobile money or crypto."
          : "Add a Binance Pay or USDT payout method above before you can withdraw."}
      </div>
    );
  }

  if (balance < minimum) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-zinc-400">
        Your balance is below the minimum withdrawal of{" "}
        <strong className="text-white">{formatWithdrawalMinimum(currency)}</strong>. Top up or use
        your balance for activations.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-4 py-3 text-sm text-violet-100/90">
        <strong className="text-violet-100">Withdraw policy:</strong> minimum{" "}
        {formatWithdrawalMinimum(currency)}. Requests are reviewed manually — usually within 24–48h.
      </div>

      <Input
        label={`Amount to withdraw (${currency})`}
        type="number"
        min={minimum}
        max={balance}
        step="0.01"
        placeholder={`Min ${minimum}`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        hint={`Available: ${formatCurrency(balance, currency)}`}
        required
      />

      <div>
        <p className="text-sm text-zinc-400 mb-2">Send to</p>
        <div className="space-y-2">
          {eligibleMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaymentMethodId(m.id)}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                paymentMethodId === m.id
                  ? "border-violet-400/50 bg-violet-500/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20"
              )}
            >
              <p className="text-sm font-medium">{depositMethodLabel(m.method)}</p>
              <p className="font-mono text-xs text-zinc-400 mt-0.5 break-all">
                {m.account_identifier}
              </p>
              {m.account_name && (
                <p className="text-xs text-zinc-500 mt-0.5">{m.account_name}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
        <p className="text-sm font-medium text-white">Withdrawal terms — please read</p>
        <ul className="space-y-2 text-xs text-zinc-400 leading-relaxed list-disc list-inside">
          {policyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={policyAccepted}
            onChange={(e) => setPolicyAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500/40"
          />
          <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
            I have read and agree to the withdrawal policy. I confirm{" "}
            {selectedMethod
              ? `${depositMethodLabel(selectedMethod.method)} (${selectedMethod.account_identifier})`
              : "my selected payout method"}{" "}
            is correct.
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={loading}
        disabled={!policyAccepted || !amount || Number(amount) < minimum}
      >
        <ArrowDownToLine className="h-4 w-4" />
        Request withdrawal
      </Button>
    </form>
  );
}
