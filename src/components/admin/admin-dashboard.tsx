import Link from "next/link";
import {
  Bell,
  CreditCard,
  ExternalLink,
  Layers,
  MessageCircle,
  Package,
  Plus,
  Smartphone,
  Users,
  Wallet,
} from "lucide-react";
import { AdminQuickAction } from "@/components/admin/admin-quick-action";
import { AdminPendingDepositsPanel } from "@/components/admin/admin-pending-deposits-panel";
import type { WalletDeposit } from "@/types/database";

interface AdminDashboardProps {
  toolCount: number;
  deviceCount: number;
  attention: {
    awaitingOrders: number;
    pendingDeposits: number;
    unreadNotifications: number;
    unreadMessages: number;
    totalAttention: number;
  };
  readyDeposits: WalletDeposit[];
}

export function AdminDashboard({
  toolCount,
  deviceCount,
  attention,
  readyDeposits,
}: AdminDashboardProps) {
  return (
    <div className="space-y-8">
      {attention.totalAttention > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-3">
            Needs attention
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {attention.awaitingOrders > 0 && (
              <Link
                href="/admin/payments"
                className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100 hover:bg-violet-500/15 transition-colors"
              >
                <strong className="text-white">{attention.awaitingOrders}</strong> order
                {attention.awaitingOrders !== 1 ? "s" : ""} need activation
              </Link>
            )}
            {attention.pendingDeposits > 0 && (
              <Link
                href="/admin/deposits"
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 hover:bg-amber-500/15 transition-colors"
              >
                <strong className="text-white">{attention.pendingDeposits}</strong> pending
                deposit{attention.pendingDeposits !== 1 ? "s" : ""}
              </Link>
            )}
            {attention.unreadNotifications > 0 && (
              <Link
                href="/admin/inbox"
                className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-500/15 transition-colors"
              >
                <strong className="text-white">{attention.unreadNotifications}</strong> inbox
                notification{attention.unreadNotifications !== 1 ? "s" : ""}
              </Link>
            )}
            {attention.unreadMessages > 0 && (
              <Link
                href="/admin/messages"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 hover:bg-emerald-500/15 transition-colors"
              >
                <strong className="text-white">{attention.unreadMessages}</strong> unread chat
                message{attention.unreadMessages !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
        </section>
      )}

      {readyDeposits.length > 0 && (
        <section>
          <AdminPendingDepositsPanel deposits={readyDeposits} compact />
        </section>
      )}

      <section>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Store catalog</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {toolCount} tool{toolCount !== 1 ? "s" : ""} · {deviceCount} device
              {deviceCount !== 1 ? "s" : ""} on the storefront
            </p>
          </div>
          <Link
            href="/tools"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview storefront
          </Link>
        </div>

        <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100/90">
          <strong className="text-cyan-200">How the catalog works:</strong> add a{" "}
          <strong>tool</strong> (sidebar name customers see) → then add{" "}
          <strong>devices</strong> under it (model, price, download link).
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <AdminQuickAction
            href="/admin/categories"
            title="Manage catalog"
            description="View all tools and devices in one place — edit, delete, add devices per tool"
            icon={Layers}
            accent="cyan"
          />
          <AdminQuickAction
            href="/admin/categories/new"
            title="Add new tool"
            description="Create a tool group — e.g. Check SMD A12, HFZ A12, Bypass Offers"
            icon={Plus}
            accent="violet"
          />
          <AdminQuickAction
            href="/admin/tools/new"
            title="Add device"
            description="Add a device under a tool — set model name, price, and download link"
            icon={Smartphone}
            accent="emerald"
          />
          <AdminQuickAction
            href="/tools"
            title="View storefront"
            description="See how customers browse tools and devices on the live site"
            icon={ExternalLink}
            accent="amber"
            external
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Orders & customers</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminQuickAction
            href="/admin/payments"
            title="Orders to fulfill"
            description="Send activation keys for paid orders"
            icon={CreditCard}
            accent="violet"
            badge={attention.awaitingOrders}
          />
          <AdminQuickAction
            href="/admin/deposits"
            title="Wallet deposits"
            description="Confirm wallet deposits (MTN, Airtel, Binance Pay, USDT)"
            icon={Wallet}
            accent="amber"
            badge={attention.pendingDeposits}
          />
          <AdminQuickAction
            href="/admin/inbox"
            title="Inbox"
            description="New orders, deposits, and system notifications"
            icon={Bell}
            accent="cyan"
            badge={attention.unreadNotifications}
          />
          <AdminQuickAction
            href="/admin/messages"
            title="Customer chat"
            description="Reply to support messages"
            icon={MessageCircle}
            accent="emerald"
            badge={attention.unreadMessages}
          />
          <AdminQuickAction
            href="/admin/users"
            title="Customers"
            description="View accounts and manage admin access"
            icon={Users}
            accent="cyan"
          />
          <AdminQuickAction
            href="/admin/ledger"
            title="Accounting"
            description="Ledger, withdrawals, and reconciliation"
            icon={CreditCard}
            accent="violet"
          />
          <AdminQuickAction
            href="/admin/credits"
            title="Wholesale credits"
            description="Upstream reseller balance tracking"
            icon={Package}
            accent="amber"
          />
        </div>
      </section>
    </div>
  );
}
