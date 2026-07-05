import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { MessageCircle, Receipt, Wallet } from "lucide-react";
import { AppleIcon } from "@/components/brand/apple-icon";
import { ActivationCard } from "@/components/dashboard/activation-card";
import { DashboardRealtimeRefresh } from "@/components/dashboard/dashboard-realtime-refresh";
import { ActivationWaitingPanel } from "@/components/dashboard/activation-waiting-panel";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { OrderCard } from "@/components/dashboard/order-card";
import { SupportChat } from "@/components/support/support-chat";
import { DepositForm } from "@/components/wallet/deposit-form";
import { PendingDepositsList } from "@/components/wallet/pending-deposits-list";
import { UserNotificationsInbox } from "@/components/user/user-notifications-inbox";
import { Button } from "@/components/ui/button";
import { requireUser, getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActivations, getUserPayments } from "@/lib/data";
import {
  getMerchantDetails,
  getOrCreateWallet,
  getPlatformFee,
  getUserDeposits,
  getWalletTransactions,
} from "@/lib/wallet";
import { WalletTransactionsList } from "@/components/wallet/wallet-transactions-list";
import { formatCurrency } from "@/lib/utils";
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
  const params = await searchParams;
  const tab =
    params.tab === "activations" ||
    params.tab === "messages" ||
    params.tab === "wallet" ||
    params.tab === "inbox"
      ? params.tab
      : "orders";

  if (isAdmin && (tab === "wallet" || tab === "messages")) {
    redirect("/admin/ledger");
  }

  const [activations, orders, wallet, transactions, deposits, notifications, inboxUnread] =
    await Promise.all([
    getActivations(user.id),
    getUserPayments(user.id),
    isAdmin ? Promise.resolve(null) : getOrCreateWallet(user.id),
    isAdmin ? Promise.resolve([]) : getWalletTransactions(user.id),
    isAdmin ? Promise.resolve([]) : getUserDeposits(user.id),
    isAdmin ? Promise.resolve([]) : getUserNotifications(user.id),
    isAdmin ? Promise.resolve(0) : getUnreadUserNotificationCount(user.id),
  ]);

  const merchants = getMerchantDetails();
  const platformFee = getPlatformFee();
  const balance = wallet ? Number(wallet.balance) : 0;
  const pendingProcessing = deposits.filter(
    (d) => d.status === "pending" && d.transaction_id
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
        {!isAdmin && <DashboardRealtimeRefresh userId={user.id} />}
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
            isAdmin={isAdmin}
            ordersCount={orders.length}
            activationsCount={activations.length}
            inboxUnread={inboxUnread}
          />
        </Suspense>

        {isAdmin && (
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
            You&apos;re signed in as admin. Customer wallet and support chat are in the{" "}
            <a href="/admin" className="underline text-amber-100">
              admin panel
            </a>
            . Merchant accounting is under{" "}
            <a href="/admin/ledger" className="underline text-amber-100">
              Merchant accounting
            </a>
            .
          </div>
        )}

        {tab === "wallet" && !isAdmin ? (
          <div className="space-y-8">
            <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                  <Wallet className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Available balance</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(balance, wallet?.currency ?? "ZMW")}
                  </p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 max-w-xs">
                Add funds via MTN or Airtel, then buy activations instantly. Service fee{" "}
                {formatCurrency(platformFee)} per order.
              </p>
            </div>

            {pendingProcessing.length > 0 && (
              <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-4 py-3 text-sm text-cyan-200">
                {pendingProcessing.length} deposit
                {pendingProcessing.length !== 1 ? "s" : ""} being processed — admin
                verification in progress.
              </div>
            )}

            <PendingDepositsList deposits={deposits} />

            <div>
              <h2 className="font-semibold text-white mb-4">Add funds</h2>
              <DepositForm merchants={merchants} currency={merchants.currency} />
            </div>

            <WalletTransactionsList transactions={transactions} />
          </div>
        ) : tab === "inbox" && !isAdmin ? (
          <div>
            <h2 className="font-semibold text-white mb-4">Inbox</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Deposit confirmations, activation ready alerts, and admin replies appear here.
            </p>
            <UserNotificationsInbox notifications={notifications} />
          </div>
        ) : tab === "messages" && !isAdmin ? (
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
                <OrderCard key={order.id} payment={order} />
              ))}
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
