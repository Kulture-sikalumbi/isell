"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Search, X } from "lucide-react";
import { RoleToggle } from "@/components/admin/role-toggle";
import { AdminWalletCreditModal } from "@/components/admin/admin-wallet-credit-modal";
import { AdminWalletDeductModal } from "@/components/admin/admin-wallet-deduct-modal";
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
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Filter customers by name or email
  const filteredCustomers = customers.filter((c) => {
    const query = customerSearchQuery.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query)
    );
  });

  // Filter users by name or email
  const filteredUsers = allUsers.filter((u) => {
    const query = userSearchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });
  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">Customers</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
            />
            {customerSearchQuery && (
              <button
                onClick={() => setCustomerSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 text-left text-zinc-500">
                <th className="px-4 sm:px-6 py-4 font-medium">Customer</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Email</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Orders</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Total spent</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Wallet</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Joined</th>
                <th className="px-4 sm:px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
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
                  <td className="px-4 sm:px-6 py-4 text-cyan-300">
                    {formatCurrency(c.wallet_balance ?? 0, c.wallet_currency ?? undefined)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-zinc-500">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex flex-col items-start gap-2">
                      <Link
                        href={`/admin/messages?user=${c.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Message
                      </Link>
                      <AdminWalletCreditModal
                        userId={c.id}
                        email={c.email}
                        fullName={c.full_name}
                        walletCurrency={c.wallet_currency ?? c.display_currency}
                        walletBalance={c.wallet_balance ?? 0}
                      />
                      <AdminWalletDeductModal
                        userId={c.id}
                        email={c.email}
                        fullName={c.full_name}
                        walletCurrency={c.wallet_currency ?? c.display_currency}
                        walletBalance={c.wallet_balance ?? 0}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <div className="p-12 text-center text-zinc-500">
              {customerSearchQuery ? "No customers match your search" : "No customers yet"}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">All accounts & roles</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
            />
            {userSearchQuery && (
              <button
                onClick={() => setUserSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
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
              {filteredUsers.map((user) => (
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
          {filteredUsers.length === 0 && (
            <div className="p-12 text-center text-zinc-500">
              {userSearchQuery ? "No users match your search" : "No users found"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
