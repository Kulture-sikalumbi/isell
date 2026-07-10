import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StoreAssistantGate } from "@/components/assistant/store-assistant-gate";
import { CustomerDepositPromptGate } from "@/components/wallet/customer-deposit-prompt-gate";
import { WelcomeEmailTrigger } from "@/components/auth/welcome-email-trigger";

export const dynamic = "force-dynamic";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    </>
  );
}
