"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, Loader2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReceiptDownloadButton } from "@/components/dashboard/receipt-download-button";
import { getCustomerIdentifierLabel } from "@/lib/identifier-label";
import { formatOrderNumber } from "@/lib/order-number";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getSiteCurrency } from "@/lib/currency";
import type { Activation, Payment } from "@/types/database";

interface OrderCardProps {
  payment: Payment;
  activation?: Activation | null;
}

function orderStatus(payment: Payment): {
  label: string;
  variant: "success" | "warning" | "danger" | "default" | "info";
} {
  if (payment.status === "pending") {
    return { label: "Payment pending", variant: "warning" };
  }
  if (payment.status === "failed") {
    return { label: "Failed", variant: "danger" };
  }
  if (payment.status === "refunded") {
    return { label: "Refunded", variant: "default" };
  }
  if (payment.fulfillment_status === "awaiting") {
    return { label: "Processing", variant: "info" };
  }
  if (payment.fulfillment_status === "fulfilled") {
    return { label: "Activation ready", variant: "success" };
  }
  return { label: "Paid", variant: "success" };
}

export function OrderCard({ payment, activation }: OrderCardProps) {
  const [copied, setCopied] = useState(false);
  const status = orderStatus(payment);
  const isWallet = payment.provider === "wallet";
  const totalPaid = Number(payment.amount) + Number(payment.platform_fee ?? 0);
  const displayCurrency = getSiteCurrency();
  const isAwaiting = payment.fulfillment_status === "awaiting";
  const hasKey = Boolean(activation?.activation_code);
  const isRefunded = payment.status === "refunded";

  function copyCode() {
    if (!activation?.activation_code) return;
    navigator.clipboard.writeText(activation.activation_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="glass rounded-2xl p-6 border border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-white">
            {payment.tool?.name ?? "Tool order"}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            Order #{formatOrderNumber(payment)}
            {isWallet && (
              <span className="text-cyan-500/80 ml-2">· Paid from wallet</span>
            )}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-black/30 border border-white/5 px-4 py-3">
          <p className="text-xs text-zinc-500 mb-1">
            {getCustomerIdentifierLabel(payment.tool?.identifier_label)}
          </p>
          <p className="font-mono text-zinc-200">{payment.hardware_id}</p>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/5 px-4 py-3">
          <p className="text-xs text-zinc-500 mb-1">Amount paid</p>
          <p className="font-semibold text-white">
            {formatCurrency(isWallet ? totalPaid : payment.amount, displayCurrency)}
          </p>
        </div>
      </div>

      {isRefunded && (
        <div className="mt-4 rounded-xl border border-zinc-500/25 bg-zinc-500/5 p-4">
          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-zinc-200">Order rejected — wallet refunded</p>
              <p className="text-sm text-zinc-400 mt-1">
                <strong className="text-white font-medium">
                  {formatCurrency(totalPaid, displayCurrency)}
                </strong>{" "}
                was returned to your wallet.
              </p>
              {payment.refund_note && (
                <p className="text-sm text-zinc-500 mt-2 rounded-lg bg-black/30 border border-white/5 px-3 py-2 leading-relaxed">
                  <span className="text-zinc-600 text-xs uppercase tracking-wide block mb-1">
                    Reason
                  </span>
                  {payment.refund_note}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {hasKey && activation && (
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="h-4 w-4 text-emerald-400" />
            <p className="text-sm font-medium text-emerald-200">Your activation key</p>
          </div>
          {activation.activation_code === "DEVICE_REGISTERED" ? (
            <p className="text-sm text-emerald-100/90">
              Device registered — check the tool for access.
            </p>
          ) : (
            <div className="relative">
              <div className="code-block rounded-lg bg-black/40 border border-white/10 px-4 py-3 pr-12 font-mono text-base font-bold text-white tracking-wide break-all">
                {activation.activation_code}
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/10"
                title="Copy activation key"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {isAwaiting && !hasKey && (
        <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-cyan-400 animate-spin shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-cyan-100 font-medium">Waiting for activation</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Payment received — your key will be emailed and added to Activations when ready. You can
                leave this page.
              </p>
            </div>
          </div>
          <Link href={`/dashboard?tab=activations&wait=${payment.id}`}>
            <Button size="sm" variant="secondary" className="w-full sm:w-auto shrink-0">
              Track live
            </Button>
          </Link>
        </div>
      )}

      {payment.status === "completed" && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <ReceiptDownloadButton
            paymentId={payment.id}
            receiptNumber={formatOrderNumber(payment)}
          />
        </div>
      )}

      <p className="text-xs text-zinc-500 mt-4">
        Ordered {formatDate(payment.created_at)}
        {payment.completed_at && payment.status === "completed" && (
          <span> · Paid {formatDate(payment.completed_at)}</span>
        )}
        {hasKey && (
          <span>
            {" "}
            ·{" "}
            <Link
              href="/dashboard?tab=activations"
              className="text-cyan-400 hover:text-cyan-300"
            >
              All activations
            </Link>
          </span>
        )}
      </p>
    </div>
  );
}

export function getOrderDisplayStatus(payment: Payment) {
  return orderStatus(payment);
}
