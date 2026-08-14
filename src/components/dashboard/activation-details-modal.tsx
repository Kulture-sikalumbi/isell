"use client";

import { useState } from "react";
import { X, Copy, Check, Download } from "lucide-react";
import { OrderReceiptDocument } from "@/components/dashboard/order-receipt-document";
import { Button } from "@/components/ui/button";
import { buildOrderReceiptData } from "@/lib/order-receipt";
import { getCustomerIdentifierLabel } from "@/lib/identifier-label";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Activation, Payment } from "@/types/database";

interface ActivationDetailsModalProps {
  activation: Activation;
  payment: Payment;
  isOpen: boolean;
  onClose: () => void;
}

export function ActivationDetailsModal({
  activation,
  payment,
  isOpen,
  onClose,
}: ActivationDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  if (!isOpen) return null;

  function copyCode() {
    navigator.clipboard.writeText(activation.activation_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fmt = (n: number) => formatCurrency(n, payment.currency);
  const identifierLabel = getCustomerIdentifierLabel(
    activation.tool?.identifier_label
  );

  const receiptData = buildOrderReceiptData({
    payment,
    customerName: "Customer",
    customerEmail: "",
    activation,
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-2xl shadow-2xl max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-zinc-800">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">
              {showReceipt ? "Order Receipt" : "Activation Details"}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {showReceipt ? (
              // Receipt view
              <div className="flex justify-center">
                <div className="w-full max-w-sm">
                  <OrderReceiptDocument data={receiptData} />
                </div>
              </div>
            ) : (
              // Details view
              <div className="space-y-6">
                {/* Tool info */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                    Tool & Device
                  </h3>
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">Tool</p>
                      <p className="text-white font-semibold">
                        {activation.tool?.name ?? "Unknown Tool"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">
                        {identifierLabel}
                      </p>
                      <p className="text-white font-mono">
                        {activation.hardware_id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activation code */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                    Activation Code
                  </h3>
                  <div className="relative group">
                    <div className="code-block rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-lg font-bold text-gradient tracking-wider">
                      {activation.activation_code}
                    </div>
                    <button
                      onClick={copyCode}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Copy code"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Order details */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                    Order Details
                  </h3>
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Order #</span>
                      <span className="text-white font-mono font-semibold">
                        {payment.order_number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Total</span>
                      <span className="text-white font-semibold">
                        {fmt(payment.amount)}
                      </span>
                    </div>
                    {payment.platform_fee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Included fees</span>
                        <span className="text-zinc-300 text-sm">
                          {fmt(payment.platform_fee)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-zinc-700">
                      <span className="text-zinc-400">Status</span>
                      <span className="text-emerald-400 font-semibold">
                        Completed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                    Dates
                  </h3>
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Order date</span>
                      <span className="text-white">
                        {formatDate(payment.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Activated</span>
                      <span className="text-white">
                        {formatDate(activation.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex gap-3 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4">
            {showReceipt ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowReceipt(false)}
                  className="flex-1"
                >
                  Back to Details
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="flex-1 gap-2"
                >
                  <Download className="h-4 w-4" />
                  Save as PDF
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => setShowReceipt(true)}
                  className="flex-1"
                >
                  View Receipt
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
