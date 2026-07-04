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
import { cn } from "@/lib/utils";

export interface SiteNavUser {
  name: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

interface SiteNavProps {
  user: SiteNavUser | null;
}

const publicNavLinks = [
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

const authedNavLinks = [
  { href: "/dashboard?tab=messages", label: "Talk to admin", icon: MessageCircle },
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

  const navLinks = user
    ? [...publicNavLinks, ...authedNavLinks]
    : [...publicNavLinks];

  function handleHeaderSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    window.location.href = q ? `/tools?q=${encodeURIComponent(q)}` : "/tools";
  }

  return (
    <>
      {/* Desktop nav — lg and up */}
      <div className="hidden lg:flex items-center gap-6 flex-1 justify-end">
        <nav className="flex items-center gap-1">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors",
                pathname.startsWith(item.href)
                  ? "text-white bg-white/10"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {user?.isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "text-amber-300 bg-amber-500/15"
                  : "text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
              )}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        <form onSubmit={handleHeaderSearch} className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools..."
            className="w-44 xl:w-52 rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/15 transition-all"
          />
        </form>

        <div className="flex items-center gap-3">
          {user ? (
            <UserChip user={user} />
          ) : (
            <Link
              href="/auth/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
          )}
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              My Activations
            </Link>
          ) : (
            <Link
              href="/auth/login?next=/tools"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Get Started
            </Link>
          )}
        </div>
      </div>

      {/* Mobile hamburger — below lg */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden rounded-xl border border-white/10 bg-white/5 p-2.5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 w-full max-w-sm panel-solid border-l border-white/10 flex flex-col animate-slide-in-right shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <BrandWordmark size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/5"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {user && (
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full object-cover"
                    />
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
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm transition-colors",
                    pathname.startsWith(item.href)
                      ? "bg-white/10 text-white"
                      : "text-zinc-300 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              {user?.isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-amber-400 hover:bg-amber-500/10"
                >
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </Link>
              )}
              {!user && (
                <Link
                  href="/auth/login"
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-cyan-400 hover:bg-cyan-500/10"
                >
                  Sign in with Google
                </Link>
              )}
            </nav>

            <div className="p-5 border-t border-white/5 space-y-3">
              {user ? (
                <Link
                  href="/dashboard"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-cyan-500/20"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  My Activations
                </Link>
              ) : (
                <Link
                  href="/auth/login?next=/tools"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-cyan-500/20"
                >
                  <Sparkles className="h-4 w-4" />
                  Get Started
                </Link>
              )}
              {user && (
                <form action="/api/auth/signout" method="POST" className="w-full">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
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
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 hover:bg-white/10 transition-colors"
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-xs font-bold text-white">
            {initials}
          </div>
        )}
        <span className="max-w-[120px] truncate text-sm text-zinc-200">{user.name}</span>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-64 panel-solid rounded-xl border border-white/10 p-2 shadow-2xl shadow-black/50">
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
            >
              <LayoutDashboard className="h-4 w-4" />
              My Activations
            </Link>
            {user.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
            )}
            <div className="mt-1 border-t border-white/5 pt-1">
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
