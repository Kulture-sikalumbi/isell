"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CreditCard,
  ExternalLink,
  MessageCircle,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { AdminCurrencyToggle } from "@/components/admin/admin-currency-toggle";
import { useAdminAttentionCounts } from "@/components/admin/admin-nav-badges";
import { ConnectionStatus } from "@/components/layout/connection-status";
import { MerchantHeaderChip } from "@/components/layout/merchant-header-chip";
import { useLiveAdminStats } from "@/hooks/use-live-admin-stats";
import type { DisplayCurrency } from "@/lib/display-currency-preference";
import { cn } from "@/lib/utils";

const quickLinks = [
  { href: "/admin/inbox", label: "Inbox", icon: Bell, badgeKey: "unreadNotifications" as const },
  { href: "/admin/deposits", label: "Deposits", icon: Wallet, badgeKey: "pendingDeposits" as const },
  { href: "/admin/payments", label: "Orders", icon: ShoppingCart, badgeKey: "awaitingOrders" as const },
  { href: "/admin/messages", label: "Chat", icon: MessageCircle, badgeKey: "unreadMessages" as const },
];

export function AdminHeader() {
  const pathname = usePathname();
  const counts = useAdminAttentionCounts();
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("ZMW");
  const { merchantBalance, merchantCurrency, platformFees, refresh } = useLiveAdminStats({
    merchantCurrency: displayCurrency,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/display-currency");
        if (!res.ok) return;
        const data = await res.json();
        const code = data.currency === "USD" || data.currency === "ZMW" ? data.currency : "ZMW";
        if (!cancelled) setDisplayCurrency(code);
      } catch {
        // keep default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06070b]/80 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <ConnectionStatus compact />
          {counts.totalAttention > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              {counts.totalAttention} need attention
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {quickLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            const badge = counts[link.badgeKey] ?? 0;

            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                  active
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
                )}
              >
                <link.icon className="h-4 w-4" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="hidden md:block h-8 w-px bg-white/10 mx-1" />

          <AdminCurrencyToggle
            current={displayCurrency}
            compact
            className="hidden sm:flex"
            onChanged={(currency) => {
              setDisplayCurrency(currency);
              refresh();
            }}
          />

          <div className="hidden md:block">
            <MerchantHeaderChip
              balance={merchantBalance}
              platformFees={platformFees}
              currency={merchantCurrency}
              compact
            />
          </div>

          <Link
            href="/tools"
            title="View store"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {counts.totalAttention > 0 && (
        <div className="sm:hidden border-t border-white/5 px-4 py-2 flex gap-2 overflow-x-auto">
          {counts.pendingDeposits > 0 && (
            <Link
              href="/admin/deposits"
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] text-amber-200"
            >
              <Wallet className="h-3 w-3" />
              {counts.pendingDeposits} deposits
            </Link>
          )}
          {counts.pendingWithdrawals > 0 && (
            <Link
              href="/admin/withdrawals"
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-[10px] text-violet-200"
            >
              {counts.pendingWithdrawals} withdrawals
            </Link>
          )}
          {counts.awaitingOrders > 0 && (
            <Link
              href="/admin/payments"
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-[10px] text-violet-200"
            >
              <CreditCard className="h-3 w-3" />
              {counts.awaitingOrders} orders
            </Link>
          )}
          {counts.unreadMessages > 0 && (
            <Link
              href="/admin/messages"
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-1 text-[10px] text-cyan-200"
            >
              <MessageCircle className="h-3 w-3" />
              {counts.unreadMessages} chats
            </Link>
          )}
        </div>
      )}

      <div className="sm:hidden border-t border-white/5 px-4 py-2 flex justify-end">
        <AdminCurrencyToggle
          current={displayCurrency}
          compact
          onChanged={(currency) => {
            setDisplayCurrency(currency);
            refresh();
          }}
        />
      </div>
    </header>
  );
}
