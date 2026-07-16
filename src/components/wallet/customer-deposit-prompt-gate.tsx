import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getRequestCurrency } from "@/lib/request-currency";
import { getWalletDisplaySnapshot } from "@/lib/wallet";
import { DepositPromptToast } from "@/components/wallet/deposit-prompt-toast";

/** Gentle, non-blocking deposit reminder for signed-in customers. */
export async function CustomerDepositPromptGate() {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getCurrentProfile();
  if (profile?.role === "admin") return null;

  const currency = await getRequestCurrency();
  const snapshot = await getWalletDisplaySnapshot(user.id, currency);

  return (
    <DepositPromptToast
      userId={user.id}
      initialBalance={snapshot.displayBalance}
      currency={snapshot.displayCurrency}
      nativeCurrency={snapshot.nativeCurrency}
      fxRate={snapshot.fxRate}
    />
  );
}
