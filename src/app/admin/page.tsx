import Link from "next/link";
import { AlertCircle, Bell, DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { PaymentsTable } from "@/components/admin/payments-table";
import { StatCard } from "@/components/admin/stat-card";
import { getAdminStats, getPayments, getResellerCredits, getUnreadNotificationCount } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Admin — iSell Unlocking" };

export default async function AdminPage() {
  const payments = await getPayments();
  const credits = await getResellerCredits();
  const unread = await getUnreadNotificationCount();
  const stats = getAdminStats(payments, credits);

  return (
    <AdminShell title="Overview" description="Business performance at a glance">
      {unread > 0 && (
        <Link
          href="/admin/inbox"
          className="mb-6 flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200 hover:bg-cyan-500/15 transition-colors"
        >
          <Bell className="h-4 w-4 shrink-0" />
          <span>
            <strong>{unread}</strong> new notification{unread !== 1 ? "s" : ""} — open inbox to review orders
          </span>
        </Link>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} accent="cyan" />
        <StatCard label="Net Profit" value={formatCurrency(stats.profit)} icon={TrendingUp} accent="emerald" trend={`${stats.orders} orders`} />
        <StatCard label="Awaiting Process" value={stats.awaitingFulfillment.toString()} icon={AlertCircle} accent="amber" />
        <StatCard label="Completed Orders" value={stats.orders.toString()} icon={ShoppingCart} accent="violet" />
        <StatCard label="Wholesale Credit" value={formatCurrency(stats.totalCredit)} icon={Package} accent="amber" />
      </div>
      <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
      <PaymentsTable payments={payments.slice(0, 10)} showActions />
    </AdminShell>
  );
}
