"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Ban, Loader2, Mail, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type AdminPaymentRow } from "@/lib/payment-fulfillment";
import { formatOrderNumber } from "@/lib/order-number";
import { getCustomerIdentifierLabel } from "@/lib/identifier-label";
import { formatCurrency } from "@/lib/utils";
import { useNavigationLoading } from "@/components/layout/navigation-progress";

const QUICK_REASONS = [
  "Wrong IMEI / device ID",
  "Unable to activate this device",
  "Tool not supported for this model",
  "Duplicate order",
  "Customer requested cancellation",
] as const;

interface RejectOrderModalProps {
  payment: AdminPaymentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RejectOrderModal({ payment, open, onOpenChange }: RejectOrderModalProps) {
  const router = useRouter();
  const { stopLoading } = useNavigationLoading();
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refundTotal = Number(payment.amount) + Number(payment.platform_fee ?? 0);
  const customerEmail = payment.profile?.email;
  const customerName = payment.profile?.full_name;
  const idLabel = getCustomerIdentifierLabel(payment.tool?.identifier_label);
  const trimmedReason = reason.trim();
  const canSubmit = trimmedReason.length >= 3;

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

  useEffect(() => {
    if (!open) {
      setReason("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setError("Please enter a reason for the customer (at least 3 characters).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmedReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject order");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject order");
    } finally {
      setLoading(false);
      stopLoading();
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[250] overflow-y-auto overscroll-contain" role="presentation">
      <div className="flex min-h-[100dvh] items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          aria-label="Close dialog"
          onClick={() => !loading && onOpenChange(false)}
        />

        <form
          onSubmit={handleReject}
          className="relative z-10 w-full max-w-lg panel-solid rounded-2xl border border-red-500/25 p-5 sm:p-6 shadow-2xl mx-auto space-y-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-order-title"
        >
          <button
            type="button"
            onClick={() => !loading && onOpenChange(false)}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/5"
            aria-label="Close"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30">
              <Ban className="h-5 w-5 text-red-300" />
            </div>
            <div>
              <p
                id="reject-order-title"
                className="text-xs font-semibold text-red-200 uppercase tracking-wide"
              >
                Reject order
              </p>
              <p className="text-base text-white font-semibold">{payment.tool?.name ?? "Order"}</p>
            </div>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed">
            The order will be cancelled and the full amount returned to the customer&apos;s wallet.
            Your message is sent to their <strong className="text-zinc-300">email</strong> and{" "}
            <strong className="text-zinc-300">dashboard inbox</strong>.
          </p>

          <div className="rounded-xl bg-black/30 border border-white/10 divide-y divide-white/5 text-sm">
            <div className="px-4 py-3 flex justify-between gap-4">
              <span className="text-zinc-500 shrink-0">Order</span>
              <span className="font-mono text-cyan-300/90 text-right">
                {formatOrderNumber(payment)}
              </span>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4">
              <span className="text-zinc-500 shrink-0">{idLabel}</span>
              <span className="font-mono text-zinc-200 text-right break-all">{payment.hardware_id}</span>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4 items-center">
              <span className="text-zinc-500 shrink-0">Refund</span>
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                {formatCurrency(refundTotal, payment.currency)}
              </span>
            </div>
          </div>

          {customerEmail && (
            <div className="flex items-start gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
              <Mail className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-zinc-300">
                  Customer:{" "}
                  <span className="text-white font-medium">{customerName || customerEmail}</span>
                </p>
                {customerName && (
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{customerEmail}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="reject-reason" className="block text-sm font-medium text-zinc-300">
              Reason for rejection <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-zinc-500">
              Pick a quick reason or type your own message below — you can edit after selecting.
            </p>

            <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wide">
              Quick picks
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={loading}
                  onClick={() => setReason(preset)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    trimmedReason === preset
                      ? "border-red-500/50 bg-red-500/15 text-red-100"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wide pt-1">
              Your message to the customer
            </p>

            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              rows={3}
              disabled={loading}
              maxLength={500}
              placeholder="Type your reason here — e.g. The IMEI does not match the device model you selected…"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-red-500/40 focus:outline-none resize-none"
            />
            <p
              className={`text-xs text-right ${
                trimmedReason.length > 450 ? "text-amber-500/80" : "text-zinc-600"
              }`}
            >
              {trimmedReason.length}/500
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              size="md"
              variant="danger"
              disabled={loading || !canSubmit}
              className="gap-2 flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
              Reject & refund wallet
            </Button>
            <Button
              type="button"
              size="md"
              variant="ghost"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
