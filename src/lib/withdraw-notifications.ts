import { createServiceClient } from "@/lib/supabase/server";
import { sendEmailToAdmins } from "@/lib/email";
import { shouldSendAdminAlertEmails } from "@/lib/email-policy";
import { formatSiteCurrency } from "@/lib/currency";
import { getServerEmailEnv } from "@/lib/runtime-env";
import { depositMethodLabel } from "@/lib/deposit-methods";
import type { UserPaymentMethod } from "@/types/database";

export async function notifyAdminNewWithdrawal(input: {
  withdrawalId: string;
  userEmail: string;
  userName?: string;
  amount: number;
  currency: string;
  reference: string;
  paymentMethod: UserPaymentMethod;
}) {
  const supabase = createServiceClient();
  if (!supabase) return;

  const amountLabel = formatSiteCurrency(input.amount, input.currency);
  const methodLabel = depositMethodLabel(input.paymentMethod.method);
  const title = `Withdrawal requested: ${amountLabel}`;

  const payoutBits = [
    methodLabel,
    input.paymentMethod.account_identifier,
    input.paymentMethod.account_name ? `(${input.paymentMethod.account_name})` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const message = `${input.userEmail} — ${amountLabel} — ref ${input.reference} — send to ${payoutBits}`;

  await supabase.from("admin_notifications").insert({
    type: "wallet_withdrawal",
    title,
    message,
    payment_id: null,
  });

  const appUrl = getServerEmailEnv().appUrl || "http://localhost:3000";
  if (!shouldSendAdminAlertEmails()) return;

  await sendEmailToAdmins({
    subject: title,
    html: `
      <h2>New wallet withdrawal to process</h2>
      <p><strong>Customer:</strong> ${input.userName || input.userEmail}</p>
      <p><strong>Amount:</strong> ${amountLabel}</p>
      <p><strong>Reference:</strong> ${input.reference}</p>
      <p><strong>Payout method:</strong> ${methodLabel}</p>
      <p><strong>Account:</strong> ${input.paymentMethod.account_identifier}</p>
      ${input.paymentMethod.account_name ? `<p><strong>Account name:</strong> ${input.paymentMethod.account_name}</p>` : ""}
      <p><a href="${appUrl}/admin/withdrawals">Process in admin →</a></p>
    `,
  });
}
