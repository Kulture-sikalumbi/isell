"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Wallet,
  Users,
  Bell,
  CreditCard,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Wrench,
  X,
} from "lucide-react";
import { AdminNavBadge, useAdminAttentionCounts } from "@/components/admin/admin-nav-badges";
import { cn } from "@/lib/utils";

type BadgeKey =
  | "totalAttention"
  | "pendingDeposits"
  | "awaitingOrders"
  | "unreadNotifications"
  | "unreadMessages"
  | null;

interface NavLink {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey: BadgeKey;
}

interface NavSection {
  title: string;
  links: NavLink[];
}

const sections: NavSection[] = [
  {
    title: "Attention",
    links: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, badgeKey: "totalAttention" },
      { href: "/admin/inbox", label: "Inbox", icon: Bell, badgeKey: "unreadNotifications" },
      { href: "/admin/deposits", label: "Deposits", icon: Wallet, badgeKey: "pendingDeposits" },
      { href: "/admin/payments", label: "Orders to fulfill", icon: CreditCard, badgeKey: "awaitingOrders" },
      { href: "/admin/messages", label: "Customer chat", icon: MessageCircle, badgeKey: "unreadMessages" },
    ],
  },
  {
    title: "Manage",
    links: [
      { href: "/admin/tools", label: "Tools", icon: Wrench, badgeKey: null },
      { href: "/admin/users", label: "Customers", icon: Users, badgeKey: null },
      { href: "/admin/ledger", label: "Accounting", icon: CreditCard, badgeKey: null },
      { href: "/admin/credits", label: "Credits", icon: Package, badgeKey: null },
    ],
  },
];

function badgeFor(key: BadgeKey, counts: ReturnType<typeof useAdminAttentionCounts>) {
  if (!key) return 0;
  return counts[key] ?? 0;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const counts = useAdminAttentionCounts();
  const hasAttention = counts.totalAttention > 0;

  return (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
          <Settings className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-white">iSell Admin</span>
          <span className="text-xs text-zinc-500 block -mt-0.5 truncate">Control panel</span>
        </div>
        {hasAttention && <AdminNavBadge count={counts.totalAttention} />}
      </div>

      {hasAttention && (
        <div className="mx-4 mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
          <strong>{counts.totalAttention}</strong> item{counts.totalAttention !== 1 ? "s" : ""} need
          your attention — start with <strong>Overview</strong>.
        </div>
      )}

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3.5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const active =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(link.href);
                const badgeCount = badgeFor(link.badgeKey, counts);
                const isOverview = link.href === "/admin";

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-white/5",
                      isOverview && hasAttention && !active && "border border-amber-500/20 bg-amber-500/5"
                    )}
                  >
                    <link.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isOverview && hasAttention && "text-amber-400"
                      )}
                    />
                    <span className="truncate">{link.label}</span>
                    <AdminNavBadge
                      count={badgeCount}
                      variant={link.badgeKey === "unreadMessages" ? "cyan" : "amber"}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5"
        >
          ← Back to store
        </Link>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const counts = useAdminAttentionCounts();

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-white/5 bg-[#06070b]/95 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">Admin</span>
          {counts.totalAttention > 0 && <AdminNavBadge count={counts.totalAttention} />}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/5"
          aria-label="Open admin menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-[#06070b]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-zinc-400 hover:text-white z-10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </>
      )}

      <aside className="hidden lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:flex lg:h-screen lg:w-64 lg:flex-col border-r border-white/5 bg-[#06070b]/95 backdrop-blur-xl">
        <SidebarContent />
      </aside>
    </>
  );
}

interface AdminShellProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminShell({ title, description, action, children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">{title}</h1>
              {description && <p className="text-sm text-zinc-400">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
