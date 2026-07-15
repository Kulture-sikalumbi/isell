import { Badge } from "@/components/ui/badge";
import { PaymentOrderActions } from "@/components/admin/payment-order-actions";
import { CheckoutFieldsDisplay } from "@/components/orders/checkout-fields-display";
import {
  adminPaymentStatus,
  paymentNeedsFulfillment,
  sortPaymentsForAdmin,
  type AdminPaymentRow,
} from "@/lib/payment-fulfillment";
import { formatOrderNumber } from "@/lib/order-number";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment } from "@/types/database";

interface PaymentsTableProps {
  payments: Payment[];
  showActions?: boolean;
}

export function PaymentsTable({ payments, showActions = false }: PaymentsTableProps) {
  const rows = sortPaymentsForAdmin(payments as AdminPaymentRow[]);

  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-zinc-500">
        No payments recorded yet.
      </div>
    );
  }

  const needsCount = rows.filter((p) => paymentNeedsFulfillment(p)).length;

  return (
    <div className="space-y-4">
      {showActions && needsCount > 0 && (
        <p className="text-sm text-amber-200/90">
          <strong>{needsCount}</strong> order{needsCount !== 1 ? "s" : ""} waiting for an activation
          key — use <strong>Send key</strong> or <strong>Reject order</strong> in the Action column.
        </p>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-zinc-500">
                <th className="px-6 py-4 font-medium">Order #</th>
                <th className="px-6 py-4 font-medium">Tool</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">IMEI / ID</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
                {showActions && <th className="px-6 py-4 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((payment) => {
                const status = adminPaymentStatus(payment);
                const needs = paymentNeedsFulfillment(payment);

                return (
                  <tr
                    key={payment.id}
                    className={`border-b border-white/5 last:border-0 transition-colors ${
                      needs
                        ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.07]"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-6 py-4 font-mono text-xs text-cyan-300/90 whitespace-nowrap">
                      {formatOrderNumber(payment)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">{payment.tool?.name ?? "—"}</div>
                      {payment.tool?.external_service_name && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          → {payment.tool.external_service_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-300 text-xs">
                        {payment.profile?.full_name || "Customer"}
                      </div>
                      <div className="text-zinc-500 text-xs truncate max-w-[160px]">
                        {payment.profile?.email ?? "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-400 max-w-[200px]">
                      <CheckoutFieldsDisplay
                        hardwareId={payment.hardware_id}
                        checkoutFields={payment.checkout_fields}
                        identifierLabel={payment.tool?.identifier_label}
                        className="space-y-1.5"
                        labelClassName="text-[10px] text-zinc-500 mb-0.5"
                        valueClassName="font-mono text-xs text-zinc-400 break-all"
                      />
                    </td>
                    <td className="px-6 py-4 text-white">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 whitespace-nowrap">
                      {formatDate(payment.created_at)}
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 align-top">
                        <PaymentOrderActions payment={payment} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
