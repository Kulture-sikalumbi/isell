import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StoreAssistantGate } from "@/components/assistant/store-assistant-gate";
import { CustomerDepositPromptGate } from "@/components/wallet/customer-deposit-prompt-gate";
import { WelcomeEmailTrigger } from "@/components/auth/welcome-email-trigger";
import { CurrencyPreferenceGate } from "@/components/currency/currency-preference-gate";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import {
  ensureDefaultDisplayCurrencyForUser,
  normalizeDisplayCurrency,
} from "@/lib/display-currency-preference";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  let displayCurrency = normalizeDisplayCurrency(profile?.display_currency);

  if (user && profile?.role !== "admin" && !displayCurrency) {
    displayCurrency = await ensureDefaultDisplayCurrencyForUser(user.id);
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen page-enter">{children}</main>
      <SiteFooter />
      <StoreAssistantGate />
      <Suspense fallback={null}>
        <WelcomeEmailTrigger />
      </Suspense>
      <Suspense fallback={null}>
        <CustomerDepositPromptGate />
      </Suspense>
      <CurrencyPreferenceGate
        initialCurrency={displayCurrency}
        isLoggedIn={Boolean(user)}
        isAdmin={profile?.role === "admin"}
      />
    </>
  );
}
