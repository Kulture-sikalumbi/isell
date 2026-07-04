import { RoleToggle } from "@/components/admin/role-toggle";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface UsersTableProps {
  users: Profile[];
  currentUserId: string;
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  return (
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
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
            >
              <td className="px-4 sm:px-6 py-4">
                <div className="font-medium text-white">
                  {user.full_name || "—"}
                  {user.id === currentUserId && (
                    <span className="ml-2 text-xs text-cyan-400">(you)</span>
                  )}
                </div>
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

      {users.length === 0 && (
        <div className="p-12 text-center text-zinc-500">No users yet</div>
      )}
    </div>
  );
}
