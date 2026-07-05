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
  Package,
  Settings,
  Wrench,
  X,
  MoreHorizontal,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
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

const mobilePrimary = [
  { href: "/admin", label: "Home", icon: LayoutDashboard, badgeKey: "totalAttention" as const },
  { href: "/admin/inbox", label: "Inbox", icon: Bell, badgeKey: "unreadNotifications" as const },
  { href: "/admin/deposits", label: "Deposits", icon: Wallet, badgeKey: "pendingDeposits" as const },
  { href: "/admin/payments", label: "Orders", icon: CreditCard, badgeKey: "awaitingOrders" as const },
  { href: "/admin/messages", label: "Chat", icon: MessageCircle, badgeKey: "unreadMessages" as const },
];

const allLinks = sections.flatMap((s) => s.links);

function badgeFor(key: BadgeKey, counts: ReturnType<typeof useAdminAttentionCounts>) {
  if (!key) return 0;
  return counts[key] ?? 0;
}

function NavItem({
  link,
  active,
  expanded,
  onNavigate,
  counts,
}: {
  link: NavLink;
  active: boolean;
  expanded: boolean;
  onNavigate?: () => void;
  counts: ReturnType<typeof useAdminAttentionCounts>;
}) {
  const badgeCount = badgeFor(link.badgeKey, counts);

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      title={!expanded ? link.label : undefined}
      className={cn(
        "relative flex items-center rounded-xl transition-colors",
        expanded ? "gap-3 px-3.5 py-2.5 text-sm" : "justify-center p-2.5",
        active
          ? "bg-white/10 text-white"
          : "text-zinc-400 hover:text-white hover:bg-white/5"
      )}
    >
      <link.icon className="h-5 w-5 shrink-0" />
      {expanded && <span className="truncate flex-1">{link.label}</span>}
      {expanded ? (
        <AdminNavBadge
          count={badgeCount}
          variant={link.badgeKey === "unreadMessages" ? "cyan" : "amber"}
        />
      ) : (
        badgeCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[#06070b]" />
        )
      )}
    </Link>
  );
}

function SidebarContent({
  expanded,
  onNavigate,
}: {
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const counts = useAdminAttentionCounts();
  const hasAttention = counts.totalAttention > 0;

  return (
    <>
      <div
        className={cn(
          "flex h-16 items-center border-b border-white/5 shrink-0",
          expanded ? "gap-2.5 px-4" : "justify-center px-2"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
          <Settings className="h-4 w-4 text-white" />
        </div>
        {expanded && (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-white">iSell Admin</span>
            <span className="text-xs text-zinc-500 block -mt-0.5 truncate">Control panel</span>
          </div>
        )}
        {expanded && hasAttention && <AdminNavBadge count={counts.totalAttention} />}
      </div>

      {expanded && hasAttention && (
        <div className="mx-3 mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <strong>{counts.totalAttention}</strong> need attention
        </div>
      )}

      <nav className={cn("flex-1 overflow-y-auto py-3", expanded ? "px-3 space-y-6" : "px-2 space-y-1")}>
        {sections.map((section) => (
          <div key={section.title}>
            {expanded && (
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const active =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(link.href);

                return (
                  <NavItem
                    key={link.href}
                    link={link}
                    active={active}
                    expanded={expanded}
                    onNavigate={onNavigate}
                    counts={counts}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-white/5 shrink-0", expanded ? "p-3" : "p-2")}>
        {expanded ? (
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5"
          >
            ← Back to store
          </Link>
        ) : (
          <Link
            href="/"
            onClick={onNavigate}
            title="Back to store"
            className="flex justify-center rounded-xl p-2.5 text-zinc-500 hover:text-white hover:bg-white/5"
          >
            ←
          </Link>
        )}
      </div>
    </>
  );
}

function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const counts = useAdminAttentionCounts();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#06070b]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around px-1 pt-1">
        {mobilePrimary.map((link) => {
          const active =
            link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          const badge = counts[link.badgeKey] ?? 0;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 px-1 text-[10px] transition-colors",
                active ? "text-amber-300" : "text-zinc-500"
              )}
            >
              <link.icon className={cn("h-5 w-5", active && "text-amber-400")} />
              {link.label}
              {badge > 0 && (
                <span className="absolute top-1 right-1/4 h-2 w-2 rounded-full bg-amber-400" />
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="relative flex flex-1 flex-col items-center gap-0.5 py-2 px-1 text-[10px] text-zinc-500"
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </div>
    </nav>
  );
}

export function AdminSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <MobileBottomNav onMore={() => setMoreOpen(true)} />

      {moreOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMoreOpen(false)} />
          <aside className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[70vh] flex flex-col rounded-t-2xl border border-white/10 bg-[#06070b] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <span className="text-sm font-semibold text-white">All admin pages</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 grid grid-cols-2 gap-2">
              {allLinks.map((link) => {
                const active =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-3 text-sm",
                      active
                        ? "bg-amber-500/15 text-amber-100 border border-amber-500/25"
                        : "bg-white/5 text-zinc-300 border border-white/5"
                    )}
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
              <Link
                href="/"
                onClick={() => setMoreOpen(false)}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-sm text-zinc-400"
              >
                ← Back to store
              </Link>
            </div>
          </aside>
        </>
      )}

      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          "hidden lg:fixed lg:left-0 lg:top-0 lg:z-50 lg:flex lg:h-screen lg:flex-col",
          "border-r border-white/5 bg-[#06070b]/98 backdrop-blur-xl transition-[width] duration-200 ease-out",
          expanded ? "w-64 shadow-2xl shadow-black/50" : "w-[72px]"
        )}
      >
        <SidebarContent expanded={expanded} />
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
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[72px] pb-[4.5rem] lg:pb-0">
        <AdminHeader />
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
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
