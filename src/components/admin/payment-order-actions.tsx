"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RejectOrderModal } from "@/components/admin/reject-order-modal";
import {
  paymentNeedsFulfillment,
  type AdminPaymentRow,
} from "@/lib/payment-fulfillment";
import { canRejectOrder } from "@/lib/order-number";
import { PaymentFulfillAction } from "@/components/admin/payment-fulfill-action";

interface PaymentOrderActionsProps {
  payment: AdminPaymentRow;
}

export function PaymentOrderActions({ payment }: PaymentOrderActionsProps) {
  if (payment.status === "refunded") {
    return (
      <div className="space-y-1.5 max-w-[220px]">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400">
          <Ban className="h-3 w-3" />
          Rejected & refunded
        </span>
        {payment.refund_note && (
          <p className="text-[11px] text-zinc-500 leading-snug rounded-lg bg-black/30 border border-white/5 px-2.5 py-2">
            &ldquo;{payment.refund_note}&rdquo;
          </p>
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
    return <RejectOrderButton payment={payment} label="Reject order" />;
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="gap-1.5 text-red-300 hover:text-red-200 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
        onClick={() => setOpen(true)}
      >
        <Ban className="h-3.5 w-3.5" />
        {label}
      </Button>

      <RejectOrderModal payment={payment} open={open} onOpenChange={setOpen} />
    </>
  );
}
