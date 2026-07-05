"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Copy, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AirtelMoneyIcon, MtnMoMoIcon } from "@/components/payments/payment-method-icons";
import { getCurrencyLabel } from "@/lib/currency";
import { cn, formatCurrency } from "@/lib/utils";
import { useConnectivityOptional } from "@/components/layout/connectivity-provider";
import { offlineAwareFetch, offlineMessage } from "@/lib/offline-fetch";
import type { DepositMethod, WalletDeposit } from "@/types/database";

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

interface MethodOption {
  id: DepositMethod;
  label: string;
  icon?: "mtn" | "airtel";
  ussd?: string;
}

const methods: MethodOption[] = [
  { id: "mtn", label: "MTN MoMo", icon: "mtn", ussd: "*115#" },
  { id: "airtel", label: "Airtel Money", icon: "airtel", ussd: "*778#" },
];

const AMOUNT_PRESETS = [10, 50, 100, 200, 350] as const;

function merchantFor(method: DepositMethod, merchants: MerchantDetails) {
  if (method === "airtel") return merchants.airtel;
  if (method === "binance") return merchants.binance;
  return merchants.mtn;
}

function methodLabel(method: DepositMethod) {
  if (method === "airtel") return "Airtel Money";
  if (method === "binance") return "Binance Pay";
  return "MTN MoMo";
}

function InstructionStep({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

export function DepositForm({ merchants, currency }: DepositFormProps) {
  const router = useRouter();
  const connectivity = useConnectivityOptional();
  const [step, setStep] = useState<"pick" | "pay" | "done">("pick");
  const [method, setMethod] = useState<DepositMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderName, setSenderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<DepositMethod | null>(null);
  const [error, setError] = useState("");
  const [activeDeposit, setActiveDeposit] = useState<WalletDeposit | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedMerchant, setCopiedMerchant] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const merchantNumber = method ? merchantFor(method, merchants) : "";
  const methodMeta = methods.find((m) => m.id === method);

  async function startDeposit(selected: DepositMethod) {
    const parsed = Number(amount);
    if (!amount || parsed < 1) {
      setError("Enter how much you want to deposit first");
      return;
    }

    if (connectivity && !connectivity.isOnline) {
      setError("You're offline. Reconnect to start a deposit — you're still signed in.");
      return;
    }

    const number = merchantFor(selected, merchants);
    if (!number) {
      setError(`${methodLabel(selected)} merchant number is not set up yet. Contact admin.`);
      return;
    }

    setMethod(selected);
    setLoading(true);
    setLoadingMethod(selected);
    setError("");

    try {
      const res = await offlineAwareFetch("/api/wallet/deposit/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, method: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start deposit");

      setActiveDeposit(data.deposit);
      setShowDetails(false);
      setStep("pay");
    } catch (err) {
      setError(offlineMessage(err));
      setMethod(null);
    } finally {
      setLoading(false);
      setLoadingMethod(null);
    }
  }

  async function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDeposit) return;

    setLoading(true);
    setError("");

    try {
      const res = await offlineAwareFetch(`/api/wallet/deposit/${activeDeposit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transactionId,
          sender_phone: senderPhone,
          sender_name: senderName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      setStep("done");
      router.refresh();
    } catch (err) {
      setError(offlineMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string, which: "ref" | "merchant") {
    navigator.clipboard.writeText(text);
    if (which === "ref") {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } else {
      setCopiedMerchant(true);
      setTimeout(() => setCopiedMerchant(false), 2000);
    }
  }

  function resetForm() {
    setStep("pick");
    setMethod(null);
    setActiveDeposit(null);
    setAmount("");
    setTransactionId("");
    setSenderPhone("");
    setSenderName("");
    setShowDetails(false);
    setError("");
  }

  if (step === "done") {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
        <p className="text-lg font-semibold text-white">Deposit submitted</p>
        <Badge variant="warning">Awaiting admin verification</Badge>
        <p className="text-sm text-zinc-400">
          Reference{" "}
          <span className="font-mono text-white">{activeDeposit?.reference}</span>
        </p>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">
          Admin will verify your payment and credit your wallet. You&apos;ll get an inbox
          notification when it&apos;s confirmed.
        </p>
        <Button type="button" variant="secondary" onClick={resetForm}>
          Make another deposit
        </Button>
      </div>
    );
  }

  if (step === "pay" && activeDeposit && method) {
    const label = methodLabel(method);
    const ussd = methodMeta?.ussd;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {methodMeta?.icon === "mtn" && <MtnMoMoIcon className="h-10 w-10 text-[10px]" />}
          {methodMeta?.icon === "airtel" && <AirtelMoneyIcon className="h-10 w-10 text-[8px]" />}
          <div>
            <h3 className="font-semibold text-white">Deposit with {label}</h3>
            <p className="text-sm text-zinc-500">
              Send {formatCurrency(activeDeposit.amount, currency)} then finish below
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5 space-y-4">
          <p className="text-sm font-medium text-cyan-200">Follow these steps on your phone</p>

          <ol className="space-y-4">
            {ussd && (
              <InstructionStep n={1}>
                Dial <strong className="font-mono text-white">{ussd}</strong>
              </InstructionStep>
            )}
            <InstructionStep n={ussd ? 2 : 1}>
              Select <strong className="text-white">Send Money</strong>
            </InstructionStep>
            <InstructionStep n={ussd ? 3 : 2}>
              Send{" "}
              <strong className="text-white">
                {formatCurrency(activeDeposit.amount, currency)}
              </strong>{" "}
              to merchant number{" "}
              <strong className="font-mono text-white">{merchantNumber}</strong>
              <button
                type="button"
                onClick={() => copyText(merchantNumber, "merchant")}
                className="ml-2 text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                {copiedMerchant ? "Copied" : "Copy"}
              </button>
            </InstructionStep>
            <InstructionStep n={ussd ? 4 : 3}>
              Wait for the confirmation message from{" "}
              <strong className="text-white">{label}</strong> — keep the SMS, you need the
              transaction ID
            </InstructionStep>
            <InstructionStep n={ussd ? 5 : 4}>
              Come back here, tap <strong className="text-white">Finish deposit</strong> below,
              and enter your details plus the transaction ID (Txn ID)
            </InstructionStep>
          </ol>

          <div className="rounded-lg bg-black/30 border border-white/10 p-3 text-xs text-zinc-500">
            Reference (optional in payment note):{" "}
            <span className="font-mono text-zinc-300">{activeDeposit.reference}</span>
            <button
              type="button"
              onClick={() => copyText(activeDeposit.reference, "ref")}
              className="ml-2 text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
              {copiedRef ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {!showDetails ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => setShowDetails(true)}
              disabled={!merchantNumber}
            >
              Finish deposit
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={resetForm}>
              Cancel — choose another method
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmitDetails} className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <div>
                <p className="font-medium text-white text-sm">Enter your payment details</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Copy these from the {label} confirmation SMS you received after sending
                </p>
              </div>

              <Input
                label="Transaction ID (Txn ID from SMS)"
                placeholder="The long number in your payment confirmation text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                required
                autoFocus
                hint="Required — proves you really sent the money"
              />

              <Input
                label="Phone number you sent from"
                placeholder="e.g. 0970105334"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                hint="Your MTN or Airtel number that made the payment"
              />

              <Input
                label="Your name on the MoMo account"
                placeholder="e.g. John Banda"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                hint="Exactly as it appears on your mobile money account"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowDetails(false)}>
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                loading={loading}
                disabled={!transactionId.trim()}
              >
                Submit deposit
              </Button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-zinc-400 mb-3">
          How much do you want to add to your wallet?
        </p>

        <p className="text-xs text-zinc-500 mb-2">Quick amounts</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {AMOUNT_PRESETS.map((preset) => {
            const selected = Number(amount) === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(String(preset));
                  setError("");
                }}
                disabled={Boolean(loadingMethod)}
                className={cn(
                  "rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  selected
                    ? "border-cyan-400 bg-cyan-500/15 text-cyan-100"
                    : "border-white/20 bg-white/5 text-zinc-300 hover:border-cyan-500/40 hover:text-white"
                )}
              >
                {formatCurrency(preset, currency)}
              </button>
            );
          })}
        </div>

        <Input
          label={`Deposit amount (${getCurrencyLabel(currency)})`}
          type="number"
          min="1"
          step="0.01"
          placeholder="e.g. 50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={Boolean(loadingMethod)}
          className="border-2 border-white/25 bg-white/[0.07] shadow-sm shadow-black/20 focus:border-cyan-400/70 focus:ring-cyan-400/25"
        />
      </div>

      <div>
        <p className="text-sm text-zinc-400 mb-3">Deposit with</p>
        <div className="space-y-2">
          {methods.map((m) => {
            const number = merchantFor(m.id, merchants);
            const isLoading = loadingMethod === m.id;
            const disabled = Boolean(loadingMethod) || !number;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => startDeposit(m.id)}
                disabled={disabled}
                className={cn(
                  "w-full rounded-xl border px-4 py-4 text-left transition-colors flex items-center gap-4",
                  disabled && !isLoading
                    ? "border-white/5 bg-white/[0.02] text-zinc-600 cursor-not-allowed"
                    : isLoading
                      ? "border-cyan-500/40 bg-cyan-500/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white hover:border-cyan-500/30 hover:bg-cyan-500/5"
                )}
              >
                {m.icon === "mtn" && <MtnMoMoIcon className="h-10 w-10 shrink-0 text-[10px]" />}
                {m.icon === "airtel" && (
                  <AirtelMoneyIcon className="h-10 w-10 shrink-0 text-[8px]" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Deposit with {m.label}</p>
                  {isLoading ? (
                    <p className="text-xs text-cyan-300/90 mt-0.5 flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Preparing your deposit…
                    </p>
                  ) : !number ? (
                    <p className="text-xs text-amber-400/80 mt-0.5">Not available — contact admin</p>
                  ) : (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Tap to see how to pay, then finish your deposit
                    </p>
                  )}
                </div>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 text-cyan-400 animate-spin shrink-0" />
                ) : (
                  number && <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
