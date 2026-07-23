import { AdminShell } from "@/components/admin/admin-sidebar";
import { LedgerView } from "@/components/admin/ledger-view";
import { getAdminDisplayCurrency } from "@/lib/display-currency-preference";
import { getMerchantAccountingSummary } from "@/lib/ledger";

export const metadata = { title: "Account Ledger — Admin" };

export default async function AdminLedgerPage() {
  const displayCurrency = await getAdminDisplayCurrency();
  const ledger = await getMerchantAccountingSummary(displayCurrency);

  return (
    <AdminShell
      title="Merchant accounting"
      description="Track merchant phone balance, customer liabilities, and platform fees. Switch display currency in the header — figures convert for viewing only."
    >
      <LedgerView ledger={ledger} />
    </AdminShell>
  );
}
