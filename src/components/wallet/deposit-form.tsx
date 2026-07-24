"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Copy, ChevronRight, Loader2, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MomoTidHelpLink, MomoTidHelpModal } from "@/components/wallet/momo-tid-help-modal";
import { Badge } from "@/components/ui/badge";
import { PaymentMethodLogo } from "@/components/payments/payment-method-logo";
import { AirtelMoneyIcon, MtnMoMoIcon } from "@/components/payments/payment-method-icons";
import {
  depositMethodLabel,
  formatDepositSendAmount,
  isManualCryptoDeposit,
  momoRequiresZmwNotice,
} from "@/lib/deposit-methods";
import { getCurrencyLabel } from "@/lib/format-currency";
import { cn, formatCurrency } from "@/lib/utils";
import { useConnectivityOptional } from "@/components/layout/connectivity-provider";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { offlineAwareFetch, offlineMessage } from "@/lib/offline-fetch";
import type { DepositMethod, UserPaymentMethod, WalletDeposit } from "@/types/database";

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
  /** Live/manual USD→ZMW rate for MoMo checkout conversion when wallet is USD. */
  fxRate?: number | null;
  savedPaymentMethods?: UserPaymentMethod[];
}

interface MethodOption {
  id: DepositMethod;
  label: string;
  icon?: "mtn" | "airtel" | "binance" | "usdt";
  ussd?: string;
}

const ALL_METHOD_OPTIONS: MethodOption[] = [
  { id: "mtn", label: "MTN MoMo", icon: "mtn", ussd: "*115#" },
  { id: "airtel", label: "Airtel Money", icon: "airtel", ussd: "*115#" },
  { id: "binance", label: "Binance Pay", icon: "binance" },
  { id: "usdt_trc20", label: "USDT (TRC20)", icon: "usdt" },
];

const AMOUNT_PRESETS = [10, 50, 100, 200, 350] as const;

function MethodIcon({ icon }: { icon?: MethodOption["icon"] }) {
  if (!icon) return null;
  if (icon === "binance" || icon === "usdt") {
    return <PaymentMethodLogo method={icon} size="md" />;
  }
  if (icon === "mtn") return <MtnMoMoIcon className="h-10 w-10 shrink-0 text-[10px]" />;
  if (icon === "airtel") return <AirtelMoneyIcon className="h-10 w-10 shrink-0 text-[8px]" />;
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
    return acquireBodyScrollLock();
  }, [open]);

  if (!open || !mounted) return null;

  const isConfirmed = deposit.status === "confirmed";
  const isRejected = deposit.status === "rejected";
  const badgeVariant = isRejected ? "danger" : isConfirmed ? "success" : "warning";
  const badgeLabel = isRejected
    ? "Payment failed"
    : isConfirmed
      ? "Wallet credited"
      : "Awaiting verification";

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

          <CheckCircle2
            className={`h-14 w-14 mx-auto ${isConfirmed ? "text-emerald-400" : "text-amber-300"}`}
          />
          <h3 id="deposit-success-title" className="text-lg sm:text-xl font-semibold text-white">
            {isRejected
              ? "Deposit was not completed"
              : isConfirmed
                ? "Wallet credited"
                : "Deposit submitted"}
          </h3>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
          <p className="text-2xl font-semibold text-white">
            {formatCurrency(Number(deposit.amount), deposit.currency)}
          </p>
          <p className="text-sm text-zinc-400">
            Reference{" "}
            <span className="font-mono text-white">{deposit.reference}</span>
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {isRejected
              ? "This deposit could not be verified. Contact support if you already paid."
              : isConfirmed
                ? "Your MoMo payment matched instantly. The credited amount is exactly what the merchant phone received."
                : "Payment proof received. If your code matches a payment already on our system, your wallet credits instantly. Otherwise an admin will verify manually."}
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
  amountLabel,
  merchantNumber,
  methodLabel: label,
  onYes,
  onNo,
  onClose,
}: {
  open: boolean;
  amountLabel: string;
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
    return acquireBodyScrollLock();
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
            <strong className="text-white">{amountLabel}</strong> to{" "}
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

export function DepositForm({
  merchants,
  currency,
  fxRate = null,
  savedPaymentMethods = [],
}: DepositFormProps) {
  const router = useRouter();
  const connectivity = useConnectivityOptional();
  const methods = ALL_METHOD_OPTIONS;
  const [step, setStep] = useState<"pick" | "pay" | "done">("pick");
  const [method, setMethod] = useState<DepositMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
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
  const [showTidHelp, setShowTidHelp] = useState(false);
  const [tidHelpMethod, setTidHelpMethod] = useState<"mtn" | "airtel" | null>(null);
  const [tidHelpSeen, setTidHelpSeen] = useState<{ mtn: boolean; airtel: boolean }>({
    mtn: false,
    airtel: false,
  });

  const parsedAmount = Number(amount);
  const hasAmount = Number.isFinite(parsedAmount) && parsedAmount >= 1;
  const merchantNumber = method ? merchantFor(method, merchants) : "";
  const methodMeta = methods.find((m) => m.id === method);
  const isMoMoMethod = method === "mtn" || method === "airtel";
  const showMomoZmwNotice = momoRequiresZmwNotice(currency);

  function sendAmountLabel(forMethod: DepositMethod): string {
    if (!hasAmount) return "your payment";
    return formatDepositSendAmount(parsedAmount, currency, forMethod, fxRate);
  }

  function openTidHelp(selected: "mtn" | "airtel") {
    setTidHelpMethod(selected);
    setShowTidHelp(true);
  }

  function closeTidHelp() {
    if (tidHelpMethod) {
      setTidHelpSeen((prev) => ({ ...prev, [tidHelpMethod]: true }));
    }
    setShowTidHelp(false);
  }

  function maybeShowTidHelp(selected: "mtn" | "airtel") {
    if (!tidHelpSeen[selected]) {
      openTidHelp(selected);
    }
  }

  // Optional convenience only — without saved methods, every field stays manual.
  useEffect(() => {
    if (!method) return;

    const saved = savedPaymentMethods.find((m) => m.method === method);
    if (!saved) {
      setSenderPhone("");
      setSenderName("");
      return;
    }
    if (method === "binance") {
      setSenderName(saved.account_identifier);
      setSenderPhone("");
    } else if (method === "usdt_trc20") {
      setSenderPhone(saved.account_identifier);
      setSenderName("");
    } else {
      // MoMo no longer collects sender details from the user.
      setSenderPhone("");
      setSenderName("");
    }
  }, [method, savedPaymentMethods]);

  async function selectMethod(selected: DepositMethod) {
    const crypto = isManualCryptoDeposit(selected);
    if (crypto && (!amount || parsedAmount < 1)) {
      setError("Enter how much you want to deposit first");
      return;
    }

    const number = merchantFor(selected, merchants);
    if (!number) {
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
      const res = await offlineAwareFetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: hasAmount ? parsedAmount : undefined,
          method,
          transaction_id: transactionId,
          sender_phone: isMoMoMethod ? undefined : senderPhone,
          sender_name: isMoMoMethod ? undefined : senderName,
        }),
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
    setSenderPhone("");
    setSenderName("");
    setPaymentConfirmed(false);
    setShowConfirmModal(false);
    setPaymentReminder(false);
    setShowTidHelp(false);
    setTidHelpMethod(null);
    setTidHelpSeen({ mtn: false, airtel: false });
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
    const isCrypto = isManualCryptoDeposit(method);

    if (!paymentConfirmed) {
      return (
        <>
          <DepositConfirmModal
            open={showConfirmModal}
            amountLabel={sendAmountLabel(method)}
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
              if (method === "mtn" || method === "airtel") {
                maybeShowTidHelp(method);
              }
            }}
          />

          {tidHelpMethod && (
            <MomoTidHelpModal open={showTidHelp} method={tidHelpMethod} onClose={closeTidHelp} />
          )}

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
                <strong className="text-white">{sendAmountLabel(method)}</strong> to{" "}
                <strong className="font-mono break-all">{merchantNumber}</strong>, then tap Confirm
                deposit.
              </div>
            )}

            {!isCrypto && showMomoZmwNotice && (
              <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100/90">
                <strong className="text-cyan-50">MTN &amp; Airtel accept ZMW only.</strong>{" "}
                {hasAmount ? (
                  <>
                    Send{" "}
                    <strong className="text-white">{sendAmountLabel(method)}</strong> on your phone —
                    your wallet is credited in {getCurrencyLabel(currency)}.
                  </>
                ) : (
                  <>
                    Enter any Kwacha amount on your phone — we convert to{" "}
                    {getCurrencyLabel(currency)} when crediting your wallet.
                  </>
                )}
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
                      Send{" "}
                      <strong className="text-white">{sendAmountLabel(method)}</strong>{" "}
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
                      Send{" "}
                      <strong className="text-white">{sendAmountLabel(method)}</strong> in USDT
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
                      <strong className="text-white">
                        {hasAmount ? sendAmountLabel(method) : "any amount (ZMW)"}
                      </strong>{" "}
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
                      Tap <strong className="text-white">Confirm deposit</strong> and enter the{" "}
                      <strong className="text-white">code from your SMS</strong>
                      {method === "airtel" ? (
                        <>
                          {" "}
                          — the <strong className="text-white">last 6 characters</strong> of the
                          transaction ID (e.g. N80400).{" "}
                          <MomoTidHelpLink
                            method="airtel"
                            onOpen={() => openTidHelp("airtel")}
                            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                          />
                        </>
                      ) : (
                        <>
                          {" "}
                          — all <strong className="text-white">10 digits</strong> of the Financial
                          Transaction ID.{" "}
                          <MomoTidHelpLink
                            method="mtn"
                            onOpen={() => openTidHelp("mtn")}
                            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                          />
                        </>
                      )}
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
        {tidHelpMethod && (
          <MomoTidHelpModal open={showTidHelp} method={tidHelpMethod} onClose={closeTidHelp} />
        )}

        <div className="flex items-center gap-3">
          <MethodIcon icon={methodMeta?.icon} />
          <div>
            <h3 className="font-semibold text-white">Finish your deposit</h3>
            <p className="text-sm text-zinc-500">
              {hasAmount ? `${sendAmountLabel(method)} via ${label}` : `via ${label}`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200/90">
          <strong className="text-emerald-100">Great!</strong>{" "}
          {isCrypto
            ? "Enter your payment reference so admin can verify and credit your wallet."
            : "Enter the short code from your payment SMS. Your wallet credits the exact amount the merchant received — no phone or name needed."}
        </div>

        <div className="rounded-xl border-2 border-cyan-500/30 bg-black/50 p-5 sm:p-6 space-y-5 shadow-lg shadow-black/20">
          <div>
            <p className="font-semibold text-white text-sm">Payment proof</p>
            <p className="text-xs text-zinc-400 mt-1">
              {isMoMoMethod
                ? method === "airtel"
                  ? "Enter the last 6 characters from your Airtel SMS (full ID also works)"
                  : "Enter all 10 digits from your MTN MoMo SMS"
                : "These must match the payment you just completed"}
            </p>
          </div>

          {isMoMoMethod && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <MomoTidHelpLink method={method} onOpen={() => openTidHelp(method)} />
            </div>
          )}

          <Input
            variant="emphasized"
            label={
              method === "usdt_trc20"
                ? "TxID (transaction hash)"
                : method === "binance"
                  ? "Binance order / transaction ID"
                  : method === "mtn"
                    ? "Financial Transaction ID (10 digits)"
                    : "Transaction ID code (last 6 characters)"
            }
            placeholder={
              method === "usdt_trc20"
                ? "Paste the TRC20 transaction hash"
                : method === "binance"
                  ? "Paste the ID from your Binance Pay receipt"
                  : method === "mtn"
                    ? "e.g. 9297021577"
                    : "e.g. N80400"
            }
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            onFocus={() => {
              if (method === "mtn" || method === "airtel") {
                maybeShowTidHelp(method);
              }
            }}
            required
            autoFocus
            hint={
              method === "airtel"
                ? "From a line like 241014.2029.N80400 — type N80400, or paste the full ID"
                : method === "mtn"
                  ? "Paste all 10 digits from Financial Transaction Id in your MTN SMS"
                  : "Required — only available after a successful payment"
            }
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
          How much do you want to add?{" "}
          <span className="text-zinc-500">(optional for MTN / Airtel — we credit what you actually sent)</span>
        </p>

        {showMomoZmwNotice && (
          <p className="text-xs text-cyan-300/80 mb-3 leading-relaxed">
            MTN &amp; Airtel always charge in Zambian Kwacha (ZMW). If you pick mobile money, checkout
            shows your {getCurrencyLabel(currency)} amount and the Kwacha you must send. Binance Pay
            and USDT stay in USD.
          </p>
        )}

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
          label={`Deposit amount (${getCurrencyLabel(currency)}) — optional for MoMo`}
          type="number"
          min="1"
          step="0.01"
          placeholder="e.g. 50 (optional)"
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
            const disabled = Boolean(loadingMethod) || !number;
            const isMoMo = m.id === "mtn" || m.id === "airtel";
            const preview =
              hasAmount && isMoMo && showMomoZmwNotice
                ? formatDepositSendAmount(parsedAmount, currency, m.id, fxRate)
                : null;

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
                      {m.id === "binance" || m.id === "usdt_trc20"
                        ? "Pay in USD, then submit reference for verification"
                        : showMomoZmwNotice
                          ? preview
                            ? `Send ${preview} on your phone (ZMW)`
                            : "Pays in ZMW on your phone, then confirm deposit"
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
