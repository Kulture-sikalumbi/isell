"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, MessageSquare, Pencil } from "lucide-react";
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

  const isFulfilled =
    payment.fulfillment_status === "fulfilled" || payment.status === "completed";

  if (isFulfilled) {
    return (
      <div className="space-y-1.5 max-w-[220px]">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
          <Check className="h-3 w-3" />
          Delivered
        </span>
        {(payment.admin_note || payment.success_thumbnail_url) && (
          <div className="text-[11px] text-zinc-500 leading-snug rounded-lg bg-black/30 border border-white/5 px-2.5 py-2 space-y-2">
            <span className="text-zinc-600 text-[10px] uppercase tracking-wide block mb-0.5">Delivery details</span>
            {payment.success_thumbnail_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={payment.success_thumbnail_url}
                alt="Successful order thumbnail"
                className="w-full rounded-lg border border-white/10 object-cover"
              />
            )}
            {payment.admin_note && <p className="whitespace-pre-line">{payment.admin_note}</p>}
          </div>
        )}
        <AdminNoteButton payment={payment} />
        {canRejectOrder(payment) && (
          <RejectOrderButton payment={payment} label="Reject order" />
        )}
      </div>
    );
  }

  if (canRejectOrder(payment)) {
    return <RejectOrderButton payment={payment} label="Reject order" />;
  }

  return <span className="text-xs text-zinc-500">Delivered</span>;
}

function AdminNoteButton({ payment }: { payment: AdminPaymentRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(payment.admin_note ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || null }),
      });
      if (!res.ok) return;
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-1.5">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Add a note for the customer…"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none resize-none"
        />
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" disabled={saving} onClick={save} className="text-xs px-2 py-1 h-auto">
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)} className="text-xs px-2 py-1 h-auto">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 h-auto"
      onClick={() => setEditing(true)}
    >
      {payment.admin_note ? (
        <>
          <Pencil className="h-3 w-3" />
          Edit note
        </>
      ) : (
        <>
          <MessageSquare className="h-3 w-3" />
          Add note
        </>
      )}
    </Button>
  );
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
