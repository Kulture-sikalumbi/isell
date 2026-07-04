import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { RoleToggle } from "@/components/admin/role-toggle";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CustomerProfile, Profile } from "@/types/database";

interface CustomersTableProps {
  customers: CustomerProfile[];
  allUsers: Profile[];
  currentUserId: string;
}

export function CustomersTable({
  customers,
  allUsers,
  currentUserId,
}: CustomersTableProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">Customers</h2>
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 text-left text-zinc-500">
                <th className="px-4 sm:px-6 py-4 font-medium">Customer</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Email</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Orders</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Total spent</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Joined</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 sm:px-6 py-4 font-medium text-white">
                    {c.full_name || "—"}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-zinc-400">{c.email}</td>
                  <td className="px-4 sm:px-6 py-4 text-zinc-300">{c.orders_count}</td>
                  <td className="px-4 sm:px-6 py-4 text-emerald-400">
                    {formatCurrency(c.total_spent)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-zinc-500">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <Link
                      href={`/admin/messages?user=${c.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Message
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="p-12 text-center text-zinc-500">No customers yet</div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">All accounts & roles</h2>
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5 text-left text-zinc-500">
                <th className="px-4 sm:px-6 py-4 font-medium">User</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Email</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Role</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 sm:px-6 py-4 font-medium text-white">
                    {user.full_name || "—"}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs text-cyan-400">(you)</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-zinc-400">{user.email}</td>
                  <td className="px-4 sm:px-6 py-4">
                    <RoleToggle
                      userId={user.id}
                      currentRole={user.role}
                      email={user.email}
                      disabled={user.id === currentUserId}
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-zinc-500">
                    {formatDate(user.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
