"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { formatOrderNumber } from "@/lib/order-number";
import type { Activation, Payment } from "@/types/database";

interface OrderDetailModalProps {
  payment: Payment;
  activation?: Activation | null;
  open: boolean;
  onClose: () => void;
  copied: boolean;
  onCopy: () => void;
}

export function OrderDetailModal({
  payment,
  activation,
  open,
  onClose,
  copied,
  onCopy,
}: OrderDetailModalProps) {
  useEffect(() => {
    if (!open) return;
    return acquireBodyScrollLock();
  }, [open]);

  if (!open) return null;

  const successNote = payment.admin_note?.trim() || null;
  const successThumbnailUrl = payment.success_thumbnail_url?.trim() || payment.tool?.icon_url || null;
  const hasCode = Boolean(activation?.activation_code);
  const isDeviceRegistered = activation?.activation_code === "DEVICE_REGISTERED";

  return createPortal(
    <div className="fixed inset-0 z-[260] overflow-y-auto bg-black/75 backdrop-blur-sm p-4 sm:p-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#1c2337] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <h2 className="text-lg font-semibold text-white">View Order #{formatOrderNumber(payment)}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div>
              <p className="break-all font-mono text-[15px] text-zinc-200">{payment.hardware_id}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="success">Success</Badge>
                <Badge variant="info">Order processed successfully</Badge>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-[#202943] px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Result
                </span>
                {hasCode && !isDeviceRegistered && (
                  <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    COPY
                  </button>
                )}
              </div>

              {isDeviceRegistered ? (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100">
                  Service completed successfully — check the tool for access.
                </div>
              ) : hasCode ? (
                <div className="rounded-lg border border-white/8 bg-[#1a2033] px-3 py-3 font-mono text-sm text-white break-all">
                  {activation?.activation_code}
                </div>
              ) : (
                <div className="rounded-lg border border-white/8 bg-[#1a2033] px-3 py-3 text-sm text-zinc-400">
                  Order processed successfully.
                </div>
              )}

              {successThumbnailUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={successThumbnailUrl}
                  alt={payment.tool?.name ?? "Order thumbnail"}
                  className="mx-auto mt-4 max-h-72 rounded-xl border border-white/10 object-contain"
                />
              )}

              <div className="mt-4 rounded-lg border border-white/8 bg-[#1a2033] px-3 py-3 text-sm text-zinc-300">
                <p>
                  <span className="text-zinc-400">Model Description:</span>{" "}
                  {payment.tool?.description || payment.tool?.name || "—"}
                </p>
                <p className="mt-1">
                  <span className="text-zinc-400">Model:</span> {payment.tool?.name || "—"}
                </p>
              </div>

              {successNote && (
                <div className="mt-4 rounded-lg border border-white/8 bg-[#1a2033] px-3 py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Message
                  </p>
                  <p className="whitespace-pre-line text-sm leading-6 text-zinc-200">{successNote}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
