import { createServiceClient } from "@/lib/supabase/server";
import { sendEmailToAdmins } from "@/lib/email";
import { shouldSendAdminAlertEmails } from "@/lib/email-policy";
import { formatSiteCurrency } from "@/lib/currency";
import { getServerEmailEnv } from "@/lib/runtime-env";
import { DEPOSIT_METHOD_LABELS } from "@/lib/deposit-methods";
import type { DepositMethod } from "@/types/database";

const methodLabels = DEPOSIT_METHOD_LABELS;

export async function notifyAdminNewDeposit(input: {
  depositId: string;
  userEmail: string;
  userName?: string;
  amount: number;
  currency: string;
  method: DepositMethod;
  reference: string;
  transactionId: string;
  senderPhone?: string | null;
  senderName?: string | null;
}) {
  const supabase = createServiceClient();
  if (!supabase) return;

  const amountLabel = formatSiteCurrency(input.amount, input.currency);
  const title = `Deposit pending: ${amountLabel}`;
  const senderBits = [
    input.senderName ? `name ${input.senderName}` : null,
    input.senderPhone ? `from ${input.senderPhone}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const message = `${input.userEmail} — ${methodLabels[input.method]} — ref ${input.reference} — TID ${input.transactionId}${senderBits ? ` — ${senderBits}` : ""}`;

  await supabase.from("admin_notifications").insert({
    type: "wallet_deposit",
    title,
    message,
    payment_id: null,
  });

  const appUrl = getServerEmailEnv().appUrl || "http://localhost:3000";
  if (!shouldSendAdminAlertEmails()) return;

  await sendEmailToAdmins({
    subject: title,
    html: `
      <h2>New wallet deposit to verify</h2>
      <p><strong>Customer:</strong> ${input.userName || input.userEmail}</p>
      <p><strong>Amount:</strong> ${amountLabel}</p>
      <p><strong>Method:</strong> ${methodLabels[input.method]}</p>
      <p><strong>Reference:</strong> ${input.reference}</p>
      <p><strong>TID:</strong> ${input.transactionId}</p>
      ${input.senderPhone ? `<p><strong>${input.method === "usdt_trc20" ? "Sender wallet" : "Sender phone"}:</strong> ${input.senderPhone}</p>` : ""}
      ${input.senderName ? `<p><strong>${input.method === "binance" ? "Binance username" : "Sender name"}:</strong> ${input.senderName}</p>` : ""}
      <p><a href="${appUrl}/admin/deposits">Confirm in admin →</a></p>
    `,
  });
}
