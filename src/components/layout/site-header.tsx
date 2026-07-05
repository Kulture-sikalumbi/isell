import Link from "next/link";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getMerchantAccountingSummary } from "@/lib/ledger";
import { getOrCreateWallet } from "@/lib/wallet";
import { getSiteCurrency } from "@/lib/currency";
import { getUnreadUserNotificationCount } from "@/lib/user-notifications";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { LiveMerchantHeaderChip } from "@/components/layout/live-merchant-header-chip";
import { LiveWalletHeaderChip } from "@/components/layout/live-wallet-header-chip";
import { SiteNav, type SiteNavUser } from "@/components/layout/site-nav";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

  let navUser: SiteNavUser | null = null;

  if (user) {
    const base = {
      id: user.id,
      name:
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Account",
      email: user.email ?? "",
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      isAdmin,
    };

    if (isAdmin) {
      const accounting = await getMerchantAccountingSummary();
      navUser = {
        ...base,
        merchantBalance: accounting.processedSalesVolume,
        platformFees: accounting.platformFeesEarned,
        merchantCurrency: accounting.currency,
      };
    } else {
      const [wallet, inboxUnread] = await Promise.all([
        getOrCreateWallet(user.id),
        getUnreadUserNotificationCount(user.id),
      ]);
      navUser = {
        ...base,
        walletBalance: wallet ? Number(wallet.balance) : 0,
        walletCurrency: getSiteCurrency(),
        inboxUnread,
      };
    }
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#0a0b10]/95 backdrop-blur-md shadow-lg shadow-black/30">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
        <Link href="/" className="group transition-opacity hover:opacity-90 shrink-0 min-w-0">
          <BrandWordmark size="md" className="text-sm sm:text-lg" />
        </Link>
        <SiteNav user={navUser} />
      </div>
    </header>
  );
}
