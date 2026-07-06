import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { PaymentsTable } from "@/components/admin/payments-table";
import { getPayments } from "@/lib/data";
import { getAdminAttentionCounts } from "@/lib/wallet";

export const metadata = { title: "Payments — Admin" };

export default async function AdminPaymentsPage() {
  const [payments, attention] = await Promise.all([
    getPayments(),
    getAdminAttentionCounts(),
  ]);

  return (
    <AdminShell title="Orders to fulfill" description="Paid orders — paste the activation key and send to the customer (email + dashboard)">
      {attention.awaitingOrders > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {attention.awaitingOrders} order{attention.awaitingOrders !== 1 ? "s" : ""} need
              your attention
            </p>
            <p className="text-amber-200/80 mt-1">
              Customers paid from wallet. Fulfill manual activations below or they stay in
              &quot;awaiting&quot; status.
            </p>
          </div>
        </div>
      )}
      <PaymentsTable payments={payments} showActions />
    </AdminShell>
  );
}
