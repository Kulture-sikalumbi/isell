import { AdminShell } from "@/components/admin/admin-sidebar";
import { AdminDepositsTable } from "@/components/admin/admin-deposits-table";
import { getPendingDeposits } from "@/lib/wallet";

export const metadata = { title: "Deposits — Admin" };

export default async function AdminDepositsPage() {
  const deposits = await getPendingDeposits();

  return (
    <AdminShell
      title="Wallet deposits"
      description="Verify MTN / Airtel payments and credit customer wallets"
    >
      <AdminDepositsTable initialDeposits={deposits} />
    </AdminShell>
  );
}
