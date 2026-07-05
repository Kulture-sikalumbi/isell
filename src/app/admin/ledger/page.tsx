import { AdminShell } from "@/components/admin/admin-sidebar";
import { LedgerView } from "@/components/admin/ledger-view";
import { getMerchantAccountingSummary } from "@/lib/ledger";

export const metadata = { title: "Account Ledger — Admin" };

export default async function AdminLedgerPage() {
  const ledger = await getMerchantAccountingSummary();

  return (
    <AdminShell
      title="Merchant accounting"
      description="Track merchant phone balance, customer liabilities, and platform fees"
    >
      <LedgerView ledger={ledger} />
    </AdminShell>
  );
}
