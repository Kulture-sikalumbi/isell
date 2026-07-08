"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  paymentNeedsFulfillment,
  type AdminPaymentRow,
} from "@/lib/payment-fulfillment";
import { canRejectOrder, formatOrderNumber } from "@/lib/order-number";
import { getCustomerIdentifierLabel } from "@/lib/identifier-label";
import { formatCurrency } from "@/lib/utils";
import { useNavigationLoading } from "@/components/layout/navigation-progress";
import { PaymentFulfillAction } from "@/components/admin/payment-fulfill-action";

interface PaymentOrderActionsProps {
  payment: AdminPaymentRow;
}

export function PaymentOrderActions({ payment }: PaymentOrderActionsProps) {
  if (payment.status === "refunded") {
    return (
      <div className="space-y-1">
        <span className="text-xs text-zinc-500">Refunded</span>
        {payment.refund_note && (
          <p className="text-[11px] text-zinc-600 max-w-[200px] leading-snug">{payment.refund_note}</p>
        )}
      </div>
    );
  }

  if (paymentNeedsFulfillment(payment)) {
    return (
      <div className="flex flex-col gap-2 items-start">
        <PaymentFulfillAction payment={payment} />
        <RejectOrderButton payment={payment} />
      </div>
    );
  }

  if (canRejectOrder(payment)) {
    return <RejectOrderButton payment={payment} label="Reject & refund" />;
  }

  return <span className="text-xs text-zinc-500">Delivered</span>;
}

function RejectOrderButton({
  payment,
  label = "Reject order",
}: {
  payment: AdminPaymentRow;
  label?: string;
}) {
  const router = useRouter();
  const { stopLoading } = useNavigationLoading();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refundTotal =
    Number(payment.amount) + Number(payment.platform_fee ?? 0);

  async function handleReject() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject order");
      setOpen(false);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject order");
    } finally {
      setLoading(false);
      stopLoading();
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="gap-1.5 text-red-300 hover:text-red-200 hover:bg-red-500/10"
        onClick={() => setOpen(true)}
      >
        <Ban className="h-3.5 w-3.5" />
        {label}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Reject order and refund wallet?"
        variant="danger"
        confirmLabel="Reject & refund"
        loading={loading}
        error={error}
        onConfirm={handleReject}
        description={
          <div className="space-y-3">
            <p>
              Order <strong className="text-white font-mono">{formatOrderNumber(payment)}</strong> for{" "}
              <strong className="text-white">{payment.tool?.name}</strong> will be cancelled.
            </p>
            <p>
              <strong className="text-white">
                {formatCurrency(refundTotal, payment.currency)}
              </strong>{" "}
              will be returned to the customer&apos;s wallet.
            </p>
            <p className="text-xs text-zinc-500">
              {getCustomerIdentifierLabel(payment.tool?.identifier_label)}:{" "}
              <span className="font-mono text-zinc-400">{payment.hardware_id}</span>
            </p>
            <label className="block text-left">
              <span className="text-xs text-zinc-500 mb-1.5 block">Reason (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="e.g. Wrong device ID, unable to activate"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-red-500/40 focus:outline-none resize-none"
              />
            </label>
          </div>
        }
      />
    </>
  );
}
