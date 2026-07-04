import { AdminShell } from "@/components/admin/admin-sidebar";
import { PaymentsTable } from "@/components/admin/payments-table";
import { getPayments } from "@/lib/data";

export const metadata = { title: "Payments — Admin" };

export default async function AdminPaymentsPage() {
  const payments = await getPayments();
  return (
    <AdminShell title="Payments" description="Paid orders — process pending activations here">
      <PaymentsTable payments={payments} showActions />
    </AdminShell>
  );
}
