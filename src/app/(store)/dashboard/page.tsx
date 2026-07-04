import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { MessageCircle, Receipt } from "lucide-react";
import { AppleIcon } from "@/components/brand/apple-icon";
import { ActivationCard } from "@/components/dashboard/activation-card";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { OrderCard } from "@/components/dashboard/order-card";
import { SupportChat } from "@/components/support/support-chat";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getActivations, getUserPayments } from "@/lib/data";

export const metadata = {
  title: "Dashboard — iSell Unlocking",
};

interface DashboardPageProps {
  searchParams: Promise<{ error?: string; tab?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const tab =
    params.tab === "activations" || params.tab === "messages"
      ? params.tab
      : "orders";

  const [activations, orders] = await Promise.all([
    getActivations(user.id),
    getUserPayments(user.id),
  ]);

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0];

  const avatarUrl =
    user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  return (
    <section className="pt-28 pb-20">
      <div className="mx-auto max-w-4xl px-6">
        {params.error === "admin_required" && (
          <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
            Admin access is restricted. Contact the site owner if you need admin privileges.
          </div>
        )}

        <div className="flex items-center gap-4 mb-8">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName ?? "User"}
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500">
              <AppleIcon className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">My Account</h1>
            <p className="text-sm text-zinc-400">
              Signed in as <span className="text-zinc-200">{displayName}</span>
              {user.email && (
                <span className="text-zinc-500"> · {user.email}</span>
              )}
            </p>
          </div>
        </div>

        <Suspense fallback={null}>
          <DashboardTabs
            ordersCount={orders.length}
            activationsCount={activations.length}
          />
        </Suspense>

        {tab === "messages" ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="h-5 w-5 text-cyan-400" />
              <div>
                <h2 className="font-semibold text-white">Talk to admin</h2>
                <p className="text-xs text-zinc-500">
                  Questions about your order, activation, or a tool? Message us directly.
                </p>
              </div>
            </div>
            <SupportChat
              apiBase="/api/support/messages"
              emptyHint="Ask about your order, activation status, or request a tool."
              viewerRole="user"
            />
          </div>
        ) : tab === "orders" ? (
          orders.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Receipt className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 mb-2">No orders yet</p>
              <p className="text-sm text-zinc-500 mb-6">
                Your payment history and invoice records appear here.
              </p>
              <Link href="/tools">
                <Button>Browse tools</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order.id} payment={order} />
              ))}
            </div>
          )
        ) : activations.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-zinc-400 mb-2">No activations yet</p>
            <p className="text-sm text-zinc-500">
              Completed orders show activation codes here once processed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activations.map((activation) => (
              <ActivationCard key={activation.id} activation={activation} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
