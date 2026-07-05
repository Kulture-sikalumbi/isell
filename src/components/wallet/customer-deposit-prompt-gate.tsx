import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getSiteCurrency } from "@/lib/currency";
import { getOrCreateWallet } from "@/lib/wallet";
import { DepositPromptToast } from "@/components/wallet/deposit-prompt-toast";

/** Gentle, non-blocking deposit reminder for signed-in customers. */
export async function CustomerDepositPromptGate() {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getCurrentProfile();
  if (profile?.role === "admin") return null;

  const wallet = await getOrCreateWallet(user.id);

  return (
    <DepositPromptToast
      userId={user.id}
      initialBalance={wallet ? Number(wallet.balance) : 0}
      currency={getSiteCurrency()}
    />
  );
}
