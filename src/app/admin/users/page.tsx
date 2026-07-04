import { requireAdmin } from "@/lib/auth";
import { getAllProfiles, getCustomersWithStats } from "@/lib/data";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { CustomersTable } from "@/components/admin/customers-table";

export const metadata = { title: "Customers — Admin" };

export default async function AdminUsersPage() {
  const { user } = await requireAdmin();
  const [customers, allUsers] = await Promise.all([
    getCustomersWithStats(),
    getAllProfiles(),
  ]);

  return (
    <AdminShell
      title="Customers"
      description="Customer list, spending, and direct messages"
    >
      <CustomersTable
        customers={customers}
        allUsers={allUsers}
        currentUserId={user.id}
      />
    </AdminShell>
  );
}
