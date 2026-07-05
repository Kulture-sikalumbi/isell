import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment } from "@/types/database";

interface OrderCardProps {
  payment: Payment;
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
    return { label: "Completed", variant: "success" };
  }
  return { label: "Paid", variant: "success" };
}

export function OrderCard({ payment }: OrderCardProps) {
  const status = orderStatus(payment);
  const isWallet = payment.provider === "wallet";
  const platformFee = Number(payment.platform_fee ?? 0);
  const totalCharged = Number(payment.amount) + platformFee;

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-white">
            {payment.tool?.name ?? "Tool order"}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            Invoice #{payment.provider_reference ?? payment.id.slice(0, 8)}
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
            {payment.tool?.identifier_label ?? "Device ID"}
          </p>
          <p className="font-mono text-zinc-200">{payment.hardware_id}</p>
        </div>
        <div className="rounded-xl bg-black/30 border border-white/5 px-4 py-3">
          <p className="text-xs text-zinc-500 mb-1">Amount paid</p>
          {isWallet && platformFee > 0 ? (
            <div className="space-y-0.5">
              <p className="text-zinc-400 text-xs">
                Activation {formatCurrency(payment.amount, payment.currency)}
              </p>
              <p className="text-zinc-400 text-xs">
                Service fee {formatCurrency(platformFee, payment.currency)}
              </p>
              <p className="font-semibold text-white">
                Total {formatCurrency(totalCharged, payment.currency)}
              </p>
            </div>
          ) : (
            <p className="font-semibold text-white">
              {formatCurrency(payment.amount, payment.currency)}
            </p>
          )}
        </div>
      </div>

      {payment.fulfillment_status === "awaiting" && (
        <p className="mt-4 text-xs text-cyan-400/90">
          Your payment was received. We&apos;re processing your activation — check back here or under Activations soon.
        </p>
      )}

      <p className="text-xs text-zinc-500 mt-4">
        Ordered {formatDate(payment.created_at)}
        {payment.completed_at && payment.status === "completed" && (
          <span> · Paid {formatDate(payment.completed_at)}</span>
        )}
      </p>
    </div>
  );
}

export function getOrderDisplayStatus(payment: Payment) {
  return orderStatus(payment);
}
