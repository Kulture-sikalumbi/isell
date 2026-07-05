import { createServiceClient } from "@/lib/supabase/server";
import { sendEmailToAdmins } from "@/lib/email";
import type { DepositMethod } from "@/types/database";

const methodLabels: Record<DepositMethod, string> = {
  mtn: "MTN Mobile Money",
  airtel: "Airtel Money",
  binance: "Binance Pay",
  other: "Other",
};

export async function notifyAdminNewDeposit(input: {
  depositId: string;
  userEmail: string;
  userName?: string;
  amount: number;
  currency: string;
  method: DepositMethod;
  reference: string;
  transactionId: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return;

  const title = `Deposit pending: ${input.currency} ${input.amount}`;
  const message = `${input.userEmail} — ${methodLabels[input.method]} — ref ${input.reference} — txn ${input.transactionId}`;

  await supabase.from("admin_notifications").insert({
    type: "wallet_deposit",
    title,
    message,
    payment_id: null,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await sendEmailToAdmins({
    subject: title,
    html: `
      <h2>New wallet deposit to verify</h2>
      <p><strong>Customer:</strong> ${input.userName || input.userEmail}</p>
      <p><strong>Amount:</strong> ${input.currency} ${input.amount}</p>
      <p><strong>Method:</strong> ${methodLabels[input.method]}</p>
      <p><strong>Reference:</strong> ${input.reference}</p>
      <p><strong>Transaction ID:</strong> ${input.transactionId}</p>
      <p><a href="${appUrl}/admin/deposits">Confirm in admin →</a></p>
    `,
  });
}
