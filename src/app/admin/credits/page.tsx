import { AdminShell } from "@/components/admin/admin-sidebar";
import { getResellerCredits } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Credits — Admin" };

export default async function AdminCreditsPage() {
  const credits = await getResellerCredits();
  return (
    <AdminShell title="Wholesale Credits" description="Remaining balances with upstream developers">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {credits.map((credit) => (
          <div key={credit.id} className="glass rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-1">{credit.developer_name}</h3>
            <div className="text-2xl sm:text-3xl font-bold text-gradient mb-2">
              {formatCurrency(credit.balance)}
            </div>
            {credit.last_synced_at && (
              <p className="text-xs text-zinc-500">Last synced {formatDate(credit.last_synced_at)}</p>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
