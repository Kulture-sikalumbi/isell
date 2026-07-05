"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Shield,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { LiveMerchantHeaderChip } from "@/components/layout/live-merchant-header-chip";
import { LiveWalletHeaderChip } from "@/components/layout/live-wallet-header-chip";
import { UserInboxBell } from "@/components/user/user-inbox-bell";
import { useNavigationLoading } from "@/components/layout/navigation-progress";
import { cn } from "@/lib/utils";

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
}

interface SiteNavProps {
  user: SiteNavUser | null;
}

const customerNavLinks = [
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard?tab=messages", label: "Support", icon: MessageCircle },
] as const;

const adminStoreNavLinks = [
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/admin", label: "Admin", icon: Shield },
] as const;

export function SiteNav({ user }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const initials = user?.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navLinks = user?.isAdmin ? adminStoreNavLinks : user ? customerNavLinks : customerNavLinks.slice(0, 2);

  function handleHeaderSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    window.location.href = q ? `/tools?q=${encodeURIComponent(q)}` : "/tools";
  }

  const ctaHref = user?.isAdmin ? "/admin" : "/dashboard";
  const ctaLabel = user?.isAdmin ? "Admin panel" : "Dashboard";
  const CtaIcon = user?.isAdmin ? Shield : LayoutDashboard;
  const { isNavigating } = useNavigationLoading();

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex items-center gap-3 xl:gap-5 ml-auto shrink-0">
        <nav className="flex items-center gap-0.5">
          {navLinks.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname.startsWith("/admin")
                : item.href.includes("?")
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "text-white bg-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5",
                  item.href === "/admin" && "text-amber-400/90"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

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
        {user?.isAdmin && typeof user.merchantBalance === "number" && (
          <LiveMerchantHeaderChip
            initialBalance={user.merchantBalance}
            initialPlatformFees={user.platformFees}
            initialCurrency={user.merchantCurrency}
          />
        )}

        {user ? (
          <UserChip user={user} />
        ) : (
          <Link href="/auth/login" className="text-sm text-zinc-400 hover:text-white px-2">
            Sign in
          </Link>
        )}

        <Link
          href={user ? ctaHref : "/auth/login?next=/tools"}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg hover:brightness-110 transition-all",
            user?.isAdmin
              ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/20"
              : "bg-gradient-to-r from-cyan-500 to-violet-500 shadow-cyan-500/20"
          )}
        >
          {user ? <CtaIcon className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {user ? ctaLabel : "Get started"}
        </Link>
      </div>

      {/* Mobile — wallet + menu aligned right */}
      <div className="flex lg:hidden items-center gap-2 ml-auto shrink-0">
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
        {user?.isAdmin && typeof user.merchantBalance === "number" && (
          <LiveMerchantHeaderChip
            initialBalance={user.merchantBalance}
            initialCurrency={user.merchantCurrency}
            compact
          />
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "rounded-xl border border-white/10 bg-white/5 p-2.5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors",
            isNavigating && "opacity-60"
          )}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-full max-w-sm panel-solid border-l border-white/10 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <BrandWordmark size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {user && (
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt={user.name} width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-sm font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleHeaderSearch} className="p-5 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/40 focus:outline-none"
                />
              </div>
            </form>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              {!user && (
                <Link href="/auth/login" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-cyan-400">
                  Sign in with Google
                </Link>
              )}
            </nav>

            <div className="p-5 border-t border-white/5 space-y-3">
              <Link
                href={user ? ctaHref : "/auth/login?next=/tools"}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white",
                  user?.isAdmin
                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                    : "bg-gradient-to-r from-cyan-500 to-violet-500"
                )}
              >
                {user ? <CtaIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {user ? ctaLabel : "Get started"}
              </Link>
              {user && (
                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-400 hover:text-white"
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

function UserChip({ user }: { user: SiteNavUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 hover:bg-white/10"
      >
        {user.avatarUrl ? (
          <Image src={user.avatarUrl} alt={user.name} width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-xs font-bold text-white">
            {initials}
          </div>
        )}
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 panel-solid rounded-xl border border-white/10 p-2 shadow-2xl">
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
            {!user.isAdmin ? (
              <>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <Link href="/dashboard?tab=wallet" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5">
                  Wallet
                </Link>
              </>
            ) : (
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5">
                <Shield className="h-4 w-4" /> Admin panel
              </Link>
            )}
            <div className="mt-1 border-t border-white/5 pt-1">
              <form action="/api/auth/signout" method="POST">
                <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
