import { AdminShell } from "@/components/admin/admin-sidebar";
import { AdminWithdrawalsTable } from "@/components/admin/admin-withdrawals-table";
import { getPendingWithdrawals } from "@/lib/withdrawals";

export const metadata = {
  title: "Withdrawals — iSell Admin",
};

export default async function AdminWithdrawalsPage() {
  const withdrawals = await getPendingWithdrawals();

  return (
    <AdminShell
      title="Wallet withdrawals"
      description="Process customer cash-out requests to mobile money or crypto."
    >
      <AdminWithdrawalsTable initialWithdrawals={withdrawals} />
    </AdminShell>
  );
}
