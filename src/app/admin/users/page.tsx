import { requireAdmin } from "@/lib/auth";
import {
  getAllProfiles,
  getCustomerSignupStats,
  getCustomersWithStats,
} from "@/lib/data";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { CustomersTable } from "@/components/admin/customers-table";
import { StatCard } from "@/components/admin/stat-card";
import { UserPlus, Users } from "lucide-react";

export const metadata = { title: "Customers — Admin" };

export default async function AdminUsersPage() {
  const { user } = await requireAdmin();
  const [customers, allUsers, signupStats] = await Promise.all([
    getCustomersWithStats(),
    getAllProfiles(),
    getCustomerSignupStats(),
  ]);

  return (
    <AdminShell
      title="Customers"
      description="Customer list, spending, and direct messages"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total customers"
            value={String(signupStats.total)}
            icon={Users}
            accent="cyan"
          />
          <StatCard
            label="Signed up today"
            value={String(signupStats.today)}
            icon={UserPlus}
            accent="emerald"
          />
          <StatCard
            label="Last 7 days"
            value={String(signupStats.thisWeek)}
            icon={UserPlus}
            accent="violet"
          />
          <StatCard
            label="This month"
            value={String(signupStats.thisMonth)}
            icon={Users}
            accent="amber"
          />
        </div>
        <CustomersTable
          customers={customers}
          allUsers={allUsers}
          currentUserId={user.id}
        />
      </div>
    </AdminShell>
  );
}
