"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Mail, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  paymentNeedsFulfillment,
  type AdminPaymentRow,
} from "@/lib/payment-fulfillment";
import { getCustomerIdentifierLabel } from "@/lib/identifier-label";
import { useNavigationLoading } from "@/components/layout/navigation-progress";

interface PaymentFulfillActionProps {
  payment: AdminPaymentRow;
}

export function PaymentFulfillAction({ payment }: PaymentFulfillActionProps) {
  const router = useRouter();
  const { stopLoading } = useNavigationLoading();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState("");
  const [whitelistOnly, setWhitelistOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsAction = paymentNeedsFulfillment(payment);
  const customerEmail = payment.profile?.email;
  const customerName = payment.profile?.full_name;
  const idLabel = getCustomerIdentifierLabel(payment.tool?.identifier_label);

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

  if (!needsAction) {
    return <span className="text-xs text-zinc-500">Delivered</span>;
  }

  async function handleFulfill(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activation_code: code,
          whitelist_only: whitelistOnly,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOpen(false);
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
      stopLoading();
    }
  }

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[250] overflow-y-auto overscroll-contain"
            role="presentation"
          >
            <div className="flex min-h-[100dvh] min-h-full items-center justify-center p-4 sm:p-6">
              <button
                type="button"
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                aria-label="Close dialog"
                onClick={() => !loading && setOpen(false)}
              />

              <form
                onSubmit={handleFulfill}
                className="relative z-10 w-full max-w-md panel-solid rounded-2xl border border-amber-500/30 p-5 sm:p-6 shadow-2xl mx-auto space-y-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="fulfill-key-title"
              >
                <button
                  type="button"
                  onClick={() => !loading && setOpen(false)}
                  className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/5"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-3 pr-8">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
                    <KeyRound className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <p
                      id="fulfill-key-title"
                      className="text-xs font-semibold text-amber-200 uppercase tracking-wide"
                    >
                      Send activation key
                    </p>
                    <p className="text-base text-white font-semibold">{payment.tool?.name}</p>
                  </div>
                </div>

                {payment.tool?.description && (
                  <p className="text-sm text-zinc-400 leading-relaxed border-l-2 border-white/10 pl-3">
                    {payment.tool.description}
                  </p>
                )}

                {customerEmail && (
                  <div className="flex items-start gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
                    <Mail className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-zinc-300">
                        Emails to{" "}
                        <span className="text-white font-medium">
                          {customerName || customerEmail}
                        </span>
                      </p>
                      {customerName && (
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{customerEmail}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">
                        Also saved to customer Activations tab instantly.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-3 text-sm">
                  <p className="text-xs text-zinc-500 mb-1">{idLabel}</p>
                  <p className="font-mono text-zinc-200 break-all">{payment.hardware_id}</p>
                </div>

                {payment.tool?.external_service_name && (
                  <p className="text-xs text-cyan-400/90">
                    Upstream service: {payment.tool.external_service_name}
                  </p>
                )}

                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste activation key"
                  disabled={whitelistOnly || loading}
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none"
                />

                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whitelistOnly}
                    onChange={(e) => setWhitelistOnly(e.target.checked)}
                    disabled={loading}
                    className="rounded"
                  />
                  Device registered on server (no code to send)
                </label>

                {error && (
                  <p className="text-sm text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <Button
                    type="submit"
                    size="md"
                    disabled={loading}
                    className="gap-2 flex-1"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send to customer
                  </Button>
                  <Button
                    type="button"
                    size="md"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        size="sm"
        className="gap-2 bg-amber-500/20 text-amber-100 border border-amber-500/40 hover:bg-amber-500/30"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="h-3.5 w-3.5" />
        Send key
      </Button>
      {modal}
    </>
  );
}
