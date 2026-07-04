import { AdminShell } from "@/components/admin/admin-sidebar";
import { LedgerView } from "@/components/admin/ledger-view";
import { getLedgerSummary } from "@/lib/ledger";

export const metadata = { title: "Account Ledger — Admin" };

export default async function AdminLedgerPage() {
  const ledger = await getLedgerSummary();

  return (
    <AdminShell
      title="Account ledger"
      description="Mobile money balance and incoming funds"
    >
      <LedgerView ledger={ledger} />
    </AdminShell>
  );
}
