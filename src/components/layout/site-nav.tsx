"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Home,
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Receipt,
  Shield,
  Sparkles,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { AdminPanelHeaderChip } from "@/components/layout/admin-panel-header-chip";
import { LiveMerchantHeaderChip } from "@/components/layout/live-merchant-header-chip";
import { LiveWalletHeaderChip } from "@/components/layout/live-wallet-header-chip";
import { UserInboxBell } from "@/components/user/user-inbox-bell";
import { ConnectionStatus } from "@/components/layout/connection-status";
import { useNavigationLoading } from "@/components/layout/navigation-progress";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface SiteNavUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  walletBalance?: number;
  walletCurrency?: string;
  merchantBalance?: number;
  merchantCurrency?: string;
  platformFees?: number;
  inboxUnread?: number;
  adminAttention?: number;
  pendingDeposits?: number;
  awaitingOrders?: number;
  adminInboxUnread?: number;
  adminMessagesUnread?: number;
}

interface SiteNavProps {
  user: SiteNavUser | null;
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof Wrench;
  badge?: number;
};

const guestMenuLinks: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tools", label: "Tools", icon: Wrench },
];

const customerMenuLinks: NavItem[] = [
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard?tab=wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard?tab=activations", label: "My activations", icon: KeyRound },
  { href: "/dashboard?tab=inbox", label: "Inbox", icon: Bell },
  { href: "/dashboard?tab=messages", label: "Support", icon: MessageCircle },
];

function buildAdminDrawerLinks(user: SiteNavUser): NavItem[] {
  return [
    { href: "/admin", label: "Overview", icon: Shield, badge: user.adminAttention },
    { href: "/admin/inbox", label: "Inbox", icon: Bell, badge: user.adminInboxUnread },
    { href: "/admin/deposits", label: "Deposits", icon: Wallet, badge: user.pendingDeposits },
    { href: "/admin/payments", label: "Orders to fulfill", icon: KeyRound, badge: user.awaitingOrders },
    {
      href: "/admin/messages",
      label: "Customer chat",
      icon: MessageCircle,
      badge: user.adminMessagesUnread,
    },
    { href: "/admin/ledger", label: "Accounting", icon: Receipt },
    { href: "/admin/tools", label: "Manage tools", icon: Wrench },
    { href: "/tools", label: "View storefront", icon: Home },
  ];
}

function UserAvatarBadge({ user }: { user: SiteNavUser }) {
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex items-center gap-2 shrink-0 pl-0.5"
      title={user.name}
    >
      {user.avatarUrl ? (
        <Image
          src={user.avatarUrl}
          alt={user.name}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-[10px] font-bold text-white">
          {initials}
        </div>
      )}
      <span className="hidden sm:block max-w-[88px] truncate text-xs font-medium text-zinc-200 pr-1">
        {user.name.split(" ")[0]}
      </span>
      {user.isAdmin && (
        <Shield className="hidden sm:block h-3 w-3 text-amber-400 shrink-0" aria-hidden />
      )}
    </div>
  );
}

function drawerLinkClass(active: boolean, admin = false) {
  return cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium border transition-colors",
    active
      ? admin
        ? "text-white bg-amber-500/15 border-amber-500/35"
        : "text-white bg-cyan-500/15 border-cyan-500/35"
      : "text-zinc-100 bg-[#181a24] border-white/10 hover:bg-[#1e2130] hover:border-white/20"
  );
}

export function SiteNav({ user }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isNavigating } = useNavigationLoading();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    return acquireBodyScrollLock();
  }, [open]);

  const drawerLinks: NavItem[] = user?.isAdmin
    ? buildAdminDrawerLinks(user)
    : user
      ? customerMenuLinks.map((item) =>
          item.href.includes("tab=inbox")
            ? { ...item, badge: user.inboxUnread ?? 0 }
            : item
        )
      : guestMenuLinks;

  function isLinkActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href.includes("?")) return pathname === href.split("?")[0];
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const menuTrigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "rounded-lg border-0 bg-transparent p-2 text-white hover:bg-white/10 transition-colors shrink-0",
        isNavigating && "opacity-60"
      )}
      aria-label="Open menu"
      aria-expanded={open}
    >
      <Menu className="h-5 w-5" />
    </button>
  );

  const accountMenu = user ? (
    <div className="flex items-center gap-1 shrink-0 rounded-xl border border-white/10 bg-[#14151c] p-0.5">
      <UserAvatarBadge user={user} />
      {menuTrigger}
    </div>
  ) : (
    menuTrigger
  );

  return (
    <>
      {/* Desktop — far right: wallet · inbox · [☰ + avatar] */}
      <div className="hidden lg:flex items-center gap-2 xl:gap-3 ml-auto shrink-0 min-w-0">
        <ConnectionStatus compact className="hidden xl:flex" />
        {user && !user.isAdmin && typeof user.walletBalance === "number" && (
          <LiveWalletHeaderChip
            userId={user.id}
            initialBalance={user.walletBalance}
            currency={user.walletCurrency}
          />
        )}
        {user && !user.isAdmin && (
          <UserInboxBell userId={user.id} initialUnread={user.inboxUnread ?? 0} />
        )}
        {user?.isAdmin && (
          <AdminPanelHeaderChip initialAttention={user.adminAttention ?? 0} />
        )}
        {user?.isAdmin && typeof user.merchantBalance === "number" && (
          <LiveMerchantHeaderChip
            initialBalance={user.merchantBalance}
            initialPlatformFees={user.platformFees}
            initialCurrency={user.merchantCurrency}
          />
        )}
        {!user && (
          <>
            <Link href="/auth/login" className="text-sm text-zinc-400 hover:text-white px-2">
              Sign in
            </Link>
            <Link
              href="/auth/login?next=/tools"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg hover:brightness-110 transition-all bg-gradient-to-r from-cyan-500 to-violet-500 shadow-cyan-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Get started
            </Link>
          </>
        )}
        {accountMenu}
      </div>

      {/* Mobile — far right: wallet · inbox · [☰ + avatar] */}
      <div className="flex lg:hidden items-center gap-1.5 ml-auto shrink-0">
        {user && !user.isAdmin && typeof user.walletBalance === "number" && (
          <LiveWalletHeaderChip
            userId={user.id}
            initialBalance={user.walletBalance}
            currency={user.walletCurrency}
            compact
          />
        )}
        {user && !user.isAdmin && (
          <UserInboxBell userId={user.id} initialUnread={user.inboxUnread ?? 0} compact />
        )}
        {user?.isAdmin && (
          <AdminPanelHeaderChip compact initialAttention={user.adminAttention ?? 0} />
        )}
        {user?.isAdmin && typeof user.merchantBalance === "number" && (
          <LiveMerchantHeaderChip
            initialBalance={user.merchantBalance}
            initialCurrency={user.merchantCurrency}
            compact
          />
        )}
        {!user && (
          <Link
            href="/auth/login?next=/tools"
            className="inline-flex items-center rounded-xl border border-cyan-500/35 bg-gradient-to-r from-cyan-500/15 to-violet-500/15 p-2 text-cyan-100"
            aria-label="Sign in"
          >
            <LogIn className="h-4 w-4" />
          </Link>
        )}
        {accountMenu}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div
            className="absolute inset-0 bg-black/85"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            className="relative z-10 w-full max-w-[280px] sm:max-w-xs flex flex-col shadow-2xl animate-slide-in-right border-l border-white/15 bg-[#0a0b10]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0f1016]">
              {user?.isAdmin ? (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-100">Admin menu</span>
                </div>
              ) : (
                <BrandWordmark size="sm" />
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="p-3 space-y-1.5 bg-[#0a0b10]">
              {drawerLinks.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={drawerLinkClass(isLinkActive(item.href), user?.isAdmin)}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      user?.isAdmin ? "text-amber-400" : "text-cyan-400"
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        user?.isAdmin
                          ? "bg-amber-500/20 text-amber-200"
                          : "bg-cyan-500/20 text-cyan-300"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}

              {!user && (
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className={drawerLinkClass(false)}
                >
                  <LogIn className="h-4 w-4 shrink-0 text-cyan-400" />
                  Sign in
                </Link>
              )}
            </nav>

            <div className="px-3 pb-3 pt-1 bg-[#0a0b10]">
              {!user ? (
                <Link
                  href="/auth/login?next=/tools"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-violet-500"
                >
                  <Sparkles className="h-4 w-4" />
                  Get started
                </Link>
              ) : (
                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#181a24] px-3 py-2.5 text-sm text-zinc-200 hover:text-white hover:bg-[#1e2130]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
