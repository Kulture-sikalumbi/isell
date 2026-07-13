import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { MessageCircle, Receipt } from "lucide-react";
import { AppleIcon } from "@/components/brand/apple-icon";
import { ActivationCard } from "@/components/dashboard/activation-card";
import { DashboardRealtimeRefresh } from "@/components/dashboard/dashboard-realtime-refresh";
import { ActivationWaitingPanel } from "@/components/dashboard/activation-waiting-panel";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { OrderCard } from "@/components/dashboard/order-card";
import { SupportChat } from "@/components/support/support-chat";
import { WalletPanel } from "@/components/wallet/wallet-panel";
import { WalletHistoryPanel } from "@/components/wallet/wallet-history-panel";
import { UserNotificationsInbox } from "@/components/user/user-notifications-inbox";
import { Button } from "@/components/ui/button";
import { requireUser, getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActivations, getUserPayments } from "@/lib/data";
import {
  getMerchantDetails,
  getPendingWalletDeposits,
  getOrCreateWallet,
} from "@/lib/wallet";
import { getUserPaymentMethods } from "@/lib/payment-methods";
import { getPendingWithdrawalForUser } from "@/lib/withdrawals";
import { getRequestCurrency } from "@/lib/request-currency";
import { getUserNotifications, getUnreadUserNotificationCount } from "@/lib/user-notifications";

export const metadata = {
  title: "Dashboard — iSell Unlocks",
};

interface DashboardPageProps {
  searchParams: Promise<{ error?: string; tab?: string; wait?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

  if (isAdmin) {
    redirect("/admin");
  }

  const params = await searchParams;
  const tab =
    params.tab === "activations" ||
    params.tab === "messages" ||
    params.tab === "wallet" ||
    params.tab === "history" ||
    params.tab === "inbox"
      ? params.tab
      : "orders";

  const isWalletArea = tab === "wallet" || tab === "history";
  const displayCurrency = await getRequestCurrency();

  const [activations, orders, wallet, notifications, inboxUnread, pendingDeposits, paymentMethods, pendingWithdrawal] =
    await Promise.all([
      getActivations(user.id),
      getUserPayments(user.id),
      isWalletArea ? getOrCreateWallet(user.id, displayCurrency) : Promise.resolve(null),
      getUserNotifications(user.id),
      getUnreadUserNotificationCount(user.id),
      getPendingWalletDeposits(user.id),
      isWalletArea ? getUserPaymentMethods(user.id) : Promise.resolve([]),
      isWalletArea ? getPendingWithdrawalForUser(user.id) : Promise.resolve(null),
  ]);

  const merchants = await getMerchantDetails(displayCurrency);
  const balance = wallet ? Number(wallet.balance) : 0;

  const activationByPaymentId = new Map(
    activations
      .filter((a) => a.payment_id)
      .map((a) => [a.payment_id as string, a])
  );

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0];

  const avatarUrl =
    user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  return (
    <section className="pt-28 pb-20 page-enter">
      <div className="mx-auto max-w-4xl px-6">
        <DashboardRealtimeRefresh userId={user.id} />
        {params.error === "admin_required" && (
          <div className="mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
            Admin access is restricted. Contact the site owner if you need admin privileges.
          </div>
        )}

        <div className="relative mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5 sm:p-6 overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-4">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName ?? "User"}
                width={52}
                height={52}
                className="h-[52px] w-[52px] rounded-2xl object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 ring-2 ring-white/10">
                <AppleIcon className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">My Account</h1>
              <p className="text-sm text-zinc-400 truncate">
                <span className="text-zinc-200">{displayName}</span>
                {user.email && (
                  <span className="text-zinc-500"> · {user.email}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          <DashboardTabs
            ordersCount={orders.length}
            activationsCount={activations.length}
            inboxUnread={inboxUnread}
            pendingDeposits={pendingDeposits.length}
          />
        </Suspense>

        {tab === "wallet" && wallet ? (
          <Suspense fallback={null}>
            <WalletPanel
              balance={balance}
              currency={displayCurrency}
              merchants={merchants}
              pendingDepositCount={pendingDeposits.length}
              paymentMethods={paymentMethods}
              pendingWithdrawal={pendingWithdrawal}
            />
          </Suspense>
        ) : tab === "history" && wallet ? (
          <Suspense fallback={null}>
            <WalletHistoryPanel
              balance={balance}
              currency={displayCurrency}
              pendingDepositCount={pendingDeposits.length}
            />
          </Suspense>
        ) : tab === "inbox" ? (
          <div>
            <h2 className="font-semibold text-white mb-4">Inbox</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Deposit confirmations, activation ready alerts, and admin replies appear here.
            </p>
            <UserNotificationsInbox notifications={notifications} />
          </div>
        ) : tab === "messages" ? (
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
        ) : tab === "activations" ? (
          params.wait ? (
            <ActivationWaitingPanel paymentId={params.wait} />
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
        )
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
                <OrderCard
                  key={order.id}
                  payment={order}
                  activation={activationByPaymentId.get(order.id)}
                />
              ))}
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
