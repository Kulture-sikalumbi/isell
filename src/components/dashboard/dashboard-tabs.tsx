"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Bell,
  History,
  KeyRound,
  Loader2,
  MessageCircle,
  Receipt,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigationLoading } from "@/components/layout/navigation-progress";

const customerTabs = [
  { id: "orders", label: "Orders", icon: Receipt, href: "/dashboard" },
  { id: "wallet", label: "Wallet", icon: Wallet, href: "/dashboard?tab=wallet" },
  { id: "history", label: "Transactions", icon: History, href: "/dashboard?tab=history" },
  { id: "activations", label: "Activations", icon: KeyRound, href: "/dashboard?tab=activations" },
  { id: "inbox", label: "Inbox", icon: Bell, href: "/dashboard?tab=inbox" },
  { id: "messages", label: "Support", icon: MessageCircle, href: "/dashboard?tab=messages" },
] as const;

const adminTabs = [
  { id: "orders", label: "Orders", icon: Receipt, href: "/dashboard" },
  { id: "activations", label: "Activations", icon: KeyRound, href: "/dashboard?tab=activations" },
] as const;

export type DashboardTab = (typeof customerTabs)[number]["id"];

interface DashboardTabsProps {
  isAdmin?: boolean;
  ordersCount: number;
  activationsCount: number;
  inboxUnread?: number;
  pendingDeposits?: number;
}

export function DashboardTabs({
  isAdmin = false,
  ordersCount,
  activationsCount,
  inboxUnread = 0,
  pendingDeposits = 0,
}: DashboardTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startNavigation } = useNavigationLoading();
  const [isPending, startTransition] = useTransition();
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const tabs = isAdmin ? adminTabs : customerTabs;
  const active: DashboardTab =
    tabParam === "activations" ||
    tabParam === "messages" ||
    tabParam === "wallet" ||
    tabParam === "history" ||
    tabParam === "inbox"
      ? tabParam
      : "orders";

  useEffect(() => {
    setPendingTab(null);
  }, [tabParam]);

  function goToTab(tabId: string, href: string) {
    if (tabId === active && !isPending) return;
    setPendingTab(tabId);
    startNavigation();
    startTransition(() => {
      router.push(href);
    });
  }

  function badgeFor(tabId: string) {
    if (tabId === "orders") return ordersCount;
    if (tabId === "activations") return activationsCount;
    if (tabId === "inbox") return inboxUnread;
    if (tabId === "history") return pendingDeposits;
    return 0;
  }

  return (
    <div className="mb-8 -mx-1 px-1 overflow-x-auto scrollbar-thin">
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-[#0c0d12]/80 border border-white/10 w-max min-w-full sm:min-w-0 sm:w-fit backdrop-blur-sm">
        {tabs.map((tab) => {
          const count = badgeFor(tab.id);
          const isActive = active === tab.id;
          const isLoading = pendingTab === tab.id;
          const isWalletArea = tab.id === "wallet" || tab.id === "history";

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => goToTab(tab.id, tab.href)}
              disabled={isLoading}
              className={cn(
                "relative rounded-xl px-3.5 sm:px-4 py-2.5 text-sm font-medium transition-all inline-flex items-center gap-2 whitespace-nowrap shrink-0",
                isActive
                  ? isWalletArea
                    ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/15 text-white border border-cyan-500/30 shadow-sm shadow-cyan-500/10"
                    : "bg-white/10 text-white border border-white/10"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent",
                isLoading && "opacity-80"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400 shrink-0" />
              ) : (
                <tab.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive && isWalletArea ? "text-cyan-400" : isActive ? "text-white" : "text-zinc-500"
                  )}
                />
              )}
              {tab.label}
              {count > 0 && !isLoading && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold min-w-[1.25rem] text-center",
                    tab.id === "inbox" && "bg-cyan-500/25 text-cyan-200",
                    tab.id === "history" && "bg-amber-500/25 text-amber-200",
                    tab.id !== "inbox" && tab.id !== "history" && "bg-white/10 text-zinc-300"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
