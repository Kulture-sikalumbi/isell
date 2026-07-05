import Link from "next/link";
import { AlertCircle, Bell, CreditCard, DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { AdminPendingDepositsPanel } from "@/components/admin/admin-pending-deposits-panel";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { PaymentsTable } from "@/components/admin/payments-table";
import { StatCard } from "@/components/admin/stat-card";
import { getAdminStats, getPayments, getResellerCredits, getUnreadNotificationCount } from "@/lib/data";
import { getAdminAttentionCounts, getPendingDeposits, getPlatformFeeStats } from "@/lib/wallet";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Admin — iSell Unlocks" };

export default async function AdminPage() {
  const payments = await getPayments();
  const credits = await getResellerCredits();
  const unread = await getUnreadNotificationCount();
  const stats = getAdminStats(payments, credits);
  const [pendingDeposits, platformFees, attention] = await Promise.all([
    getPendingDeposits(),
    getPlatformFeeStats(),
    getAdminAttentionCounts(),
  ]);

  const readyToConfirm = pendingDeposits.filter((d) => d.transaction_id);

  return (
    <AdminShell title="Overview" description="Business performance at a glance">
      {attention.awaitingOrders > 0 && (
        <Link
          href="/admin/payments"
          className="mb-6 flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200 hover:bg-violet-500/15 transition-colors"
        >
          <ShoppingCart className="h-4 w-4 shrink-0" />
          <span>
            <strong>{attention.awaitingOrders}</strong> paid order
            {attention.awaitingOrders !== 1 ? "s" : ""} need activation — open Payments
          </span>
        </Link>
      )}
      {readyToConfirm.length > 0 && (
        <div className="mb-8">
          <AdminPendingDepositsPanel deposits={readyToConfirm} compact />
        </div>
      )}
      {pendingDeposits.length > readyToConfirm.length && (
        <Link
          href="/admin/deposits"
          className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 hover:bg-amber-500/15 transition-colors"
        >
          <CreditCard className="h-4 w-4 shrink-0" />
          <span>
            <strong>{pendingDeposits.length - readyToConfirm.length}</strong> deposit
            {pendingDeposits.length - readyToConfirm.length !== 1 ? "s" : ""} waiting for
            customer transaction ID
          </span>
        </Link>
      )}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} accent="cyan" />
        <StatCard label="Net Profit" value={formatCurrency(stats.profit)} icon={TrendingUp} accent="emerald" trend={`${stats.orders} orders`} />
        <StatCard label="Platform Fees" value={formatCurrency(platformFees.totalFees)} icon={CreditCard} accent="cyan" trend={`${platformFees.transactionCount} wallet orders`} />
        <StatCard label="Awaiting Process" value={stats.awaitingFulfillment.toString()} icon={AlertCircle} accent="amber" />
        <StatCard label="Completed Orders" value={stats.orders.toString()} icon={ShoppingCart} accent="violet" />
        <StatCard label="Wholesale Credit" value={formatCurrency(stats.totalCredit)} icon={Package} accent="amber" />
      </div>
      <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
      <PaymentsTable payments={payments.slice(0, 10)} showActions />
    </AdminShell>
  );
}
