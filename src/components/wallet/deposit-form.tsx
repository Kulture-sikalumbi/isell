"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Copy, ChevronRight, Loader2, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BinancePayIcon, AirtelMoneyIcon, MtnMoMoIcon, UsdtTrc20Icon } from "@/components/payments/payment-method-icons";
import { depositMethodLabel, isManualCryptoDeposit } from "@/lib/deposit-methods";
import { getCurrencyLabel } from "@/lib/currency";
import { cn, formatCurrency } from "@/lib/utils";
import { useConnectivityOptional } from "@/components/layout/connectivity-provider";
import { offlineAwareFetch, offlineMessage } from "@/lib/offline-fetch";
import type { DepositMethod, WalletDeposit } from "@/types/database";

interface MerchantDetails {
  mtn: string;
  airtel: string;
  binancePayId: string;
  usdtTrc20Address: string;
  currency: string;
}

interface DepositFormProps {
  merchants: MerchantDetails;
  currency: string;
}

interface MethodOption {
  id: DepositMethod;
  label: string;
  icon?: "mtn" | "airtel" | "binance" | "usdt";
  ussd?: string;
}

const methods: MethodOption[] = [
  { id: "mtn", label: "MTN MoMo", icon: "mtn", ussd: "*115#" },
  { id: "airtel", label: "Airtel Money", icon: "airtel", ussd: "*115#" },
  { id: "binance", label: "Binance Pay", icon: "binance" },
  { id: "usdt_trc20", label: "USDT (TRC20)", icon: "usdt" },
];

const AMOUNT_PRESETS = [10, 50, 100, 200, 350] as const;

function MethodIcon({ icon }: { icon?: MethodOption["icon"] }) {
  if (icon === "mtn") return <MtnMoMoIcon className="h-10 w-10 shrink-0 text-[10px]" />;
  if (icon === "airtel") return <AirtelMoneyIcon className="h-10 w-10 shrink-0 text-[8px]" />;
  if (icon === "binance") return <BinancePayIcon className="h-10 w-10 shrink-0 text-[9px]" />;
  if (icon === "usdt") return <UsdtTrc20Icon className="h-10 w-10 shrink-0 text-[8px]" />;
  return null;
}

function merchantFor(method: DepositMethod, merchants: MerchantDetails) {
  if (method === "airtel") return merchants.airtel;
  if (method === "binance") return merchants.binancePayId;
  if (method === "usdt_trc20") return merchants.usdtTrc20Address;
  return merchants.mtn;
}

function methodLabel(method: DepositMethod) {
  return depositMethodLabel(method);
}

const METHOD_PREPARE_MS = 750;

function DepositSuccessModal({
  open,
  deposit,
  onClose,
  onMakeAnother,
}: {
  open: boolean;
  deposit: WalletDeposit;
  onClose: () => void;
  onMakeAnother: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const isMtnApi = deposit.provider === "mtn_momo";
  const isConfirmed = deposit.status === "confirmed";
  const isRejected = deposit.status === "rejected";
  const badgeVariant = isRejected ? "danger" : isConfirmed ? "success" : isMtnApi ? "info" : "warning";
  const badgeLabel = isRejected
    ? "Payment failed"
    : isConfirmed
      ? "Wallet credited"
      : isMtnApi
        ? "Processing with MTN"
        : "Awaiting admin verification";

  return createPortal(
    <div
      className="fixed inset-0 z-[250] overflow-y-auto overscroll-contain"
      role="presentation"
    >
      <div className="flex min-h-[100dvh] min-h-full items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          aria-label="Close dialog"
          onClick={onClose}
        />

        <div
          className="relative z-10 w-full max-w-md max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto panel-solid rounded-2xl border border-emerald-500/25 p-6 sm:p-8 shadow-2xl mx-auto text-center space-y-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deposit-success-title"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto" />
          <h3 id="deposit-success-title" className="text-lg sm:text-xl font-semibold text-white">
            {isRejected ? "Deposit was not completed" : isMtnApi ? "MTN request started" : "Deposit submitted"}
          </h3>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
          <p className="text-sm text-zinc-400">
            Reference{" "}
            <span className="font-mono text-white">{deposit.reference}</span>
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {isRejected
              ? "MTN did not complete this payment. You can try again with the same amount."
              : isMtnApi
                ? "Approve the payment prompt on your phone. Your wallet is credited automatically after MTN confirms."
                : "Admin will verify your payment and credit your wallet. You&apos;ll get an inbox notification when it&apos;s confirmed."}
          </p>
          <Button type="button" variant="secondary" className="w-full" onClick={onMakeAnother}>
            Make another deposit
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DepositConfirmModal({
  open,
  amount,
  currency,
  merchantNumber,
  methodLabel: label,
  onYes,
  onNo,
  onClose,
}: {
  open: boolean;
  amount: number;
  currency: string;
  merchantNumber: string;
  methodLabel: string;
  onYes: () => void;
  onNo: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[250] overflow-y-auto overscroll-contain"
      role="presentation"
    >
      <div className="flex min-h-[100dvh] min-h-full items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          aria-label="Close dialog"
          onClick={onClose}
        />

        <div
          className="relative z-10 w-full max-w-md max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto panel-solid rounded-2xl border border-white/10 p-5 sm:p-6 shadow-2xl mx-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deposit-confirm-title"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <h3
            id="deposit-confirm-title"
            className="text-base sm:text-lg font-semibold text-white pr-10 leading-snug"
          >
            Confirm your payment
          </h3>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed break-words">
            Have you already sent{" "}
            <strong className="text-white">{formatCurrency(amount, currency)}</strong> to{" "}
            <strong className="font-mono text-cyan-300 break-all">{merchantNumber}</strong> via{" "}
            <strong className="text-white">{label}</strong>?
          </p>
          <div className="mt-5 sm:mt-6 flex flex-col-reverse sm:flex-row gap-3">
            <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={onNo}>
              No, not yet
            </Button>
            <Button type="button" className="w-full sm:flex-1" onClick={onYes}>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Yes, I&apos;ve paid
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
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
  const [mtnPhoneNumber, setMtnPhoneNumber] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderName, setSenderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<DepositMethod | null>(null);
  const [error, setError] = useState("");
  const [submittedDeposit, setSubmittedDeposit] = useState<WalletDeposit | null>(null);
  const [copiedMerchant, setCopiedMerchant] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentReminder, setPaymentReminder] = useState(false);

  const parsedAmount = Number(amount);
  const merchantNumber = method ? merchantFor(method, merchants) : "";
  const methodMeta = methods.find((m) => m.id === method);

  useEffect(() => {
    if (!submittedDeposit || submittedDeposit.provider !== "mtn_momo") return;
    if (submittedDeposit.status !== "pending") return;

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/wallet/deposit/${submittedDeposit.id}`);
        const data = await res.json();
        if (!res.ok || cancelled || !data.deposit) return;
        setSubmittedDeposit(data.deposit as WalletDeposit);
        if ((data.deposit as WalletDeposit).status !== "pending") {
          router.refresh();
        }
      } catch {
        // Silent retry while user keeps modal open.
      }
    }, 6000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [router, submittedDeposit]);

  async function selectMethod(selected: DepositMethod) {
    if (!amount || parsedAmount < 1) {
      setError("Enter how much you want to deposit first");
      return;
    }

    const number = merchantFor(selected, merchants);
    if (selected !== "mtn" && !number) {
      setError(`${methodLabel(selected)} merchant number is not set up yet. Contact admin.`);
      return;
    }

    if (connectivity && !connectivity.isOnline) {
      setError("You're offline. Reconnect to start a deposit — you're still signed in.");
      return;
    }

    setLoadingMethod(selected);
    setError("");
    setPaymentReminder(false);

    await new Promise((resolve) => setTimeout(resolve, METHOD_PREPARE_MS));

    setMethod(selected);
    setPaymentConfirmed(false);
    setShowConfirmModal(false);
    setStep("pay");
    setLoadingMethod(null);
  }

  async function handleSubmitDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return;

    if (connectivity && !connectivity.isOnline) {
      setError("You're offline. Reconnect to submit — you're still signed in.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const endpoint = method === "mtn" ? "/api/mtn/deposit" : "/api/wallet/deposit";
      const payload =
        method === "mtn"
          ? {
              amount: parsedAmount,
              phone_number: mtnPhoneNumber,
            }
          : {
              amount: parsedAmount,
              method,
              transaction_id: transactionId,
              sender_phone: senderPhone,
              sender_name: senderName,
            };

      const res = await offlineAwareFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit deposit");

      setSubmittedDeposit(data.deposit);
      setStep("done");
      router.refresh();
    } catch (err) {
      setError(offlineMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function copyMerchant() {
    if (!merchantNumber) return;
    navigator.clipboard.writeText(merchantNumber);
    setCopiedMerchant(true);
    setTimeout(() => setCopiedMerchant(false), 2000);
  }

  function resetForm() {
    setStep("pick");
    setMethod(null);
    setSubmittedDeposit(null);
    setAmount("");
    setTransactionId("");
    setMtnPhoneNumber("");
    setSenderPhone("");
    setSenderName("");
    setPaymentConfirmed(false);
    setShowConfirmModal(false);
    setPaymentReminder(false);
    setError("");
  }

  if (step === "done" && submittedDeposit) {
    return (
      <DepositSuccessModal
        open
        deposit={submittedDeposit}
        onClose={resetForm}
        onMakeAnother={resetForm}
      />
    );
  }

  if (step === "pay" && method) {
    const label = methodLabel(method);
    const ussd = methodMeta?.ussd;

    if (method === "mtn") {
      return (
        <form onSubmit={handleSubmitDeposit} className="space-y-6">
          <div className="flex items-center gap-3">
            <MtnMoMoIcon className="h-10 w-10 text-[10px]" />
            <div>
              <h3 className="font-semibold text-white">Deposit with MTN MoMo API</h3>
              <p className="text-sm text-zinc-500">
                {formatCurrency(parsedAmount, currency)} will be requested on your phone.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            Enter your MTN number, then approve the payment prompt from MTN on your device.
          </div>

          <Input
            variant="emphasized"
            label="MTN phone number"
            placeholder="e.g. 0970105334"
            value={mtnPhoneNumber}
            onChange={(e) => setMtnPhoneNumber(e.target.value)}
            required
            autoFocus
            hint="Use the number with enough balance to complete this deposit"
          />

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Back — change amount
            </Button>
            <Button type="submit" size="lg" className="flex-1" loading={loading} disabled={!mtnPhoneNumber.trim()}>
              Send MTN payment prompt
            </Button>
          </div>
        </form>
      );
    }

    const isCrypto = isManualCryptoDeposit(method);

    if (!paymentConfirmed) {
      return (
        <>
          <DepositConfirmModal
            open={showConfirmModal}
            amount={parsedAmount}
            currency={currency}
            merchantNumber={merchantNumber}
            methodLabel={label}
            onClose={() => setShowConfirmModal(false)}
            onNo={() => {
              setShowConfirmModal(false);
              setPaymentReminder(true);
            }}
            onYes={() => {
              setShowConfirmModal(false);
              setPaymentConfirmed(true);
              setPaymentReminder(false);
              setError("");
            }}
          />

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <MethodIcon icon={methodMeta?.icon} />
              <div>
                <h3 className="font-semibold text-white">Deposit with {label}</h3>
                <p className="text-sm text-zinc-500">
                  {isCrypto
                    ? "Complete the transfer first — then tap Confirm deposit"
                    : "Pay on your phone first — then tap Confirm deposit"}
                </p>
              </div>
            </div>

            {paymentReminder && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Please finish the payment first. Send{" "}
                <strong className="text-white">{formatCurrency(parsedAmount, currency)}</strong> to{" "}
                <strong className="font-mono break-all">{merchantNumber}</strong>, then tap Confirm deposit.
              </div>
            )}

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
              <strong className="text-amber-100">Important:</strong> Only tap{" "}
              <strong className="text-white">Confirm deposit</strong> after your payment{" "}
              {isCrypto ? "is completed on-chain or in Binance" : "succeeds and you receive the SMS"}.
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5 space-y-4">
              <p className="text-sm font-medium text-cyan-200 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                {isCrypto ? "Payment instructions" : "Pay on your phone"}
              </p>

              <ol className="space-y-4">
                {method === "binance" && (
                  <>
                    <InstructionStep n={1}>
                      Open <strong className="text-white">Binance</strong> → Pay → Send
                    </InstructionStep>
                    <InstructionStep n={2}>
                      Send to Binance Pay user ID{" "}
                      <strong className="font-mono text-white">{merchantNumber}</strong>
                      <button
                        type="button"
                        onClick={copyMerchant}
                        className="ml-2 text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedMerchant ? "Copied" : "Copy"}
                      </button>
                    </InstructionStep>
                    <InstructionStep n={3}>
                      Send the equivalent of{" "}
                      <strong className="text-white">{formatCurrency(parsedAmount, currency)}</strong>{" "}
                      (admin credits your wallet after verification)
                    </InstructionStep>
                    <InstructionStep n={4}>
                      Save the <strong className="text-white">order / transaction ID</strong> from Binance
                    </InstructionStep>
                    <InstructionStep n={5}>
                      Tap <strong className="text-white">Confirm deposit</strong> below and paste that ID
                    </InstructionStep>
                  </>
                )}

                {method === "usdt_trc20" && (
                  <>
                    <InstructionStep n={1}>
                      Open your crypto wallet and choose <strong className="text-white">USDT</strong>
                    </InstructionStep>
                    <InstructionStep n={2}>
                      Network must be <strong className="text-white">TRC20 (TRON)</strong> only — other networks will be lost
                    </InstructionStep>
                    <InstructionStep n={3}>
                      Send USDT to{" "}
                      <strong className="font-mono text-white break-all">{merchantNumber}</strong>
                      <button
                        type="button"
                        onClick={copyMerchant}
                        className="ml-2 text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedMerchant ? "Copied" : "Copy"}
                      </button>
                    </InstructionStep>
                    <InstructionStep n={4}>
                      Send USDT equivalent to{" "}
                      <strong className="text-white">{formatCurrency(parsedAmount, currency)}</strong> wallet credit
                    </InstructionStep>
                    <InstructionStep n={5}>
                      Copy the blockchain <strong className="text-white">TxID / transaction hash</strong> after it confirms
                    </InstructionStep>
                    <InstructionStep n={6}>
                      Tap <strong className="text-white">Confirm deposit</strong> below and paste the TxID
                    </InstructionStep>
                  </>
                )}

                {!isCrypto && ussd && (
                  <InstructionStep n={1}>
                    Dial <strong className="font-mono text-white">{ussd}</strong>
                  </InstructionStep>
                )}
                {!isCrypto && (
                  <>
                    <InstructionStep n={ussd ? 2 : 1}>
                      Select <strong className="text-white">Send Money</strong>
                    </InstructionStep>
                    <InstructionStep n={ussd ? 3 : 2}>
                      Send{" "}
                      <strong className="text-white">{formatCurrency(parsedAmount, currency)}</strong>{" "}
                      to{" "}
                      <strong className="font-mono text-white">{merchantNumber}</strong>
                      <button
                        type="button"
                        onClick={copyMerchant}
                        className="ml-2 text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedMerchant ? "Copied" : "Copy"}
                      </button>
                    </InstructionStep>
                    <InstructionStep n={ussd ? 4 : 3}>
                      Wait until payment <strong className="text-white">succeeds</strong> — keep the
                      confirmation SMS from <strong className="text-white">{label}</strong>
                    </InstructionStep>
                    <InstructionStep n={ussd ? 5 : 4}>
                      Tap <strong className="text-white">Confirm deposit</strong> below and enter your
                      TID (Transaction ID)
                    </InstructionStep>
                  </>
                )}
              </ol>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => setShowConfirmModal(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm deposit
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={resetForm}>
                Back — change amount or method
              </Button>
            </div>
          </div>
        </>
      );
    }

    return (
      <form onSubmit={handleSubmitDeposit} className="space-y-6">
        <div className="flex items-center gap-3">
          <MethodIcon icon={methodMeta?.icon} />
          <div>
            <h3 className="font-semibold text-white">Finish your deposit</h3>
            <p className="text-sm text-zinc-500">
              {formatCurrency(parsedAmount, currency)} via {label}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200/90">
          <strong className="text-emerald-100">Great!</strong>{" "}
          {isCrypto
            ? "Enter your payment reference so admin can verify and credit your wallet."
            : "Enter the details from your payment SMS to finish your deposit."}
        </div>

        <div className="rounded-xl border-2 border-cyan-500/30 bg-black/50 p-5 sm:p-6 space-y-5 shadow-lg shadow-black/20">
          <div>
            <p className="font-semibold text-white text-sm">Payment details</p>
            <p className="text-xs text-zinc-400 mt-1">
              These must match the payment you just completed
            </p>
          </div>

          <Input
            variant="emphasized"
            label={
              method === "usdt_trc20"
                ? "TxID (transaction hash)"
                : method === "binance"
                  ? "Binance order / transaction ID"
                  : "TID (Transaction ID from SMS)"
            }
            placeholder={
              method === "usdt_trc20"
                ? "Paste the TRC20 transaction hash"
                : method === "binance"
                  ? "Paste the ID from your Binance Pay receipt"
                  : "Paste the Transaction ID from your payment SMS"
            }
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            required
            autoFocus
            hint="Required — only available after a successful payment"
          />

          {method === "binance" && (
            <Input
              variant="emphasized"
              label="Your Binance username (optional)"
              placeholder="e.g. your_binance_id"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              hint="Helps admin match your payment faster"
            />
          )}

          {method === "usdt_trc20" && (
            <Input
              variant="emphasized"
              label="Your sending wallet address (optional)"
              placeholder="TRON address you sent from"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              hint="Optional — helps admin verify on-chain"
            />
          )}

          {!isCrypto && (
            <>
              <Input
                variant="emphasized"
                label="Phone number you sent from"
                placeholder="e.g. 0970105334"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                hint="Your MTN or Airtel number that made the payment"
              />

              <Input
                variant="emphasized"
                label="Your name on the MoMo account"
                placeholder="e.g. John Banda"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                hint="Exactly as it appears on your mobile money account"
              />
            </>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPaymentConfirmed(false);
              setError("");
            }}
          >
            Back — I haven&apos;t paid yet
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
        <p className="text-sm text-zinc-400 mb-3">Then choose how you&apos;ll pay</p>
        <div className="space-y-2">
          {methods.map((m) => {
            const number = merchantFor(m.id, merchants);
            const isLoading = loadingMethod === m.id;
            const disabled = Boolean(loadingMethod) || (m.id !== "mtn" && !number);

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMethod(m.id)}
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
                <MethodIcon icon={m.icon} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">Pay with {m.label}</p>
                  {isLoading ? (
                    <p className="text-xs text-cyan-300/90 mt-0.5 flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading payment instructions…
                    </p>
                  ) : !number ? (
                    <p className="text-xs text-amber-400/80 mt-0.5">Not available — contact admin</p>
                  ) : (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {m.id === "mtn"
                        ? "Approve payment on your phone"
                        : m.id === "binance" || m.id === "usdt_trc20"
                          ? "Pay then submit reference for admin verification"
                          : "Pay on your phone, then confirm deposit"}
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
