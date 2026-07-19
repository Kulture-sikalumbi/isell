import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { getAllCategories, getAllTools, getCustomerSignupStats } from "@/lib/data";
import { getAdminAttentionCounts, getPendingDeposits } from "@/lib/wallet";

export const metadata = { title: "Admin Dashboard — iSell Unlocks" };

export default async function AdminPage() {
  const [categories, devices, pendingDeposits, attention, signupStats] = await Promise.all([
    getAllCategories(),
    getAllTools(),
    getPendingDeposits(),
    getAdminAttentionCounts(),
    getCustomerSignupStats(),
  ]);

  const catalogTools = categories.filter((c) => c.slug !== "general");
  const readyDeposits = pendingDeposits.filter((d) => d.transaction_id);

  return (
    <AdminShell
      title="Dashboard"
      description="Manage your catalog, orders, and customers"
    >
      <AdminDashboard
        toolCount={catalogTools.length}
        deviceCount={devices.length}
        signupStats={signupStats}
        attention={attention}
        readyDeposits={readyDeposits}
      />
    </AdminShell>
  );
}
