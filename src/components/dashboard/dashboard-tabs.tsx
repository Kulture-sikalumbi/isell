"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const customerTabs = [
  { id: "orders", label: "Order history", href: "/dashboard" },
  { id: "wallet", label: "Wallet", href: "/dashboard?tab=wallet" },
  { id: "activations", label: "My activations", href: "/dashboard?tab=activations" },
  { id: "inbox", label: "Inbox", href: "/dashboard?tab=inbox" },
  { id: "messages", label: "Talk to admin", href: "/dashboard?tab=messages" },
] as const;

const adminTabs = [
  { id: "orders", label: "Order history", href: "/dashboard" },
  { id: "activations", label: "My activations", href: "/dashboard?tab=activations" },
] as const;

export type DashboardTab = (typeof customerTabs)[number]["id"];

interface DashboardTabsProps {
  isAdmin?: boolean;
  ordersCount: number;
  activationsCount: number;
  inboxUnread?: number;
}

export function DashboardTabs({
  isAdmin = false,
  ordersCount,
  activationsCount,
  inboxUnread = 0,
}: DashboardTabsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tabs = isAdmin ? adminTabs : customerTabs;
  const active: DashboardTab =
    tabParam === "activations" ||
    tabParam === "messages" ||
    tabParam === "wallet" ||
    tabParam === "inbox"
      ? tabParam
      : "orders";

  return (
    <div className="flex flex-wrap gap-2 mb-8 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
      {tabs.map((tab) => {
        const count =
          tab.id === "orders"
            ? ordersCount
            : tab.id === "activations"
              ? activationsCount
              : tab.id === "inbox"
                ? inboxUnread
                : 0;
        const isActive = active === tab.id;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
            )}
          >
            {tab.label}
            {count > 0 && (
              <span
                className={cn(
                  "ml-2 text-xs",
                  tab.id === "inbox" ? "text-cyan-400" : "text-zinc-500"
                )}
              >
                ({count})
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
