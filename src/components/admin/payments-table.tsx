import { Badge } from "@/components/ui/badge";
import { PaymentFulfillAction } from "@/components/admin/payment-fulfill-action";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment } from "@/types/database";

interface PaymentsTableProps {
  payments: Payment[];
  showActions?: boolean;
}

const statusVariant = {
  completed: "success" as const,
  pending: "warning" as const,
  failed: "danger" as const,
  refunded: "default" as const,
};

function fulfillmentLabel(payment: Payment) {
  if (payment.status !== "completed") return payment.status;
  if (payment.fulfillment_status === "awaiting") return "awaiting";
  if (payment.fulfillment_status === "fulfilled") return "fulfilled";
  return payment.status;
}

function fulfillmentVariant(payment: Payment) {
  if (payment.fulfillment_status === "awaiting") return "warning" as const;
  if (payment.fulfillment_status === "fulfilled") return "success" as const;
  return statusVariant[payment.status];
}

export function PaymentsTable({ payments, showActions = false }: PaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-zinc-500">
        No payments recorded yet.
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-zinc-500">
              <th className="px-6 py-4 font-medium">Tool</th>
              <th className="px-6 py-4 font-medium">IMEI / ID</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Date</th>
              {showActions && <th className="px-6 py-4 font-medium">Action</th>}
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-white">
                    {payment.tool?.name ?? "—"}
                  </div>
                  {payment.tool?.external_service_name && (
                    <div className="text-xs text-zinc-500 mt-0.5">
                      → {payment.tool.external_service_name}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                  {payment.hardware_id}
                </td>
                <td className="px-6 py-4 text-white">
                  {formatCurrency(payment.amount, payment.currency)}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={fulfillmentVariant(payment)}>
                    {fulfillmentLabel(payment)}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-zinc-500">
                  {formatDate(payment.created_at)}
                </td>
                {showActions && (
                  <td className="px-6 py-4">
                    <PaymentFulfillAction payment={payment} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
