import { getUserEmail } from "@/lib/auth";
import {
  sendActivationReadyEmail,
  sendDepositConfirmedEmail,
  sendOrderProcessingEmail,
  sendOrderRejectedEmail,
} from "@/lib/email";
import {
  shouldSendCustomerActivationReadyEmail,
  shouldSendCustomerDepositConfirmedEmail,
  shouldSendCustomerOrderProcessingEmail,
  shouldSendCustomerOrderRejectedEmail,
} from "@/lib/email-policy";
import { formatSiteCurrency } from "@/lib/currency";
import { getServerEmailEnv } from "@/lib/runtime-env";
import { createServiceClient } from "@/lib/supabase/server";

async function getCustomerEmailContext(userId: string) {
  const email = await getUserEmail(userId);
  if (!email) return null;

  const supabase = createServiceClient();
  let customerName: string | null = null;
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();
    customerName = data?.full_name ?? null;
  }

  const appUrl = getServerEmailEnv().appUrl || "http://localhost:3000";
  return { email, customerName, appUrl };
}

export interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export async function notifyUser(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const supabase = createServiceClient();
  if (!supabase || !input.userId) return;

  await supabase.from("user_notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
  });
}

export async function getUserNotifications(userId: string, limit = 30): Promise<UserNotification[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as UserNotification[]) ?? [];
}

export async function getUnreadUserNotificationCount(userId: string): Promise<number> {
  const supabase = createServiceClient();
  if (!supabase) return 0;

  const { count } = await supabase
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  return count ?? 0;
}

export async function notifyActivationReady(input: {
  userId: string;
  toolName: string;
  toolDescription?: string | null;
  identifierLabel?: string;
  hardwareId: string;
  paymentId: string;
  activationCode: string;
}) {
  await notifyUser({
    userId: input.userId,
    type: "activation_ready",
    title: `Activation ready: ${input.toolName}`,
    message: `Your activation for ${input.toolName} (${input.hardwareId}) is ready. Tap to view your key.`,
    link: `/dashboard?tab=activations&wait=${input.paymentId}`,
  });

  const emailContext = await getCustomerEmailContext(input.userId);
  if (!emailContext || !shouldSendCustomerActivationReadyEmail()) return;

  await sendActivationReadyEmail({
    to: emailContext.email,
    toolName: input.toolName,
    toolDescription: input.toolDescription,
    hardwareId: input.hardwareId,
    identifierLabel: input.identifierLabel,
    activationCode: input.activationCode,
    appUrl: emailContext.appUrl,
    customerName: emailContext.customerName,
  });
}

export async function notifyDepositConfirmed(input: {
  userId: string;
  amount: number;
  currency: string;
}) {
  await notifyUser({
    userId: input.userId,
    type: "deposit_confirmed",
    title: "Wallet deposit confirmed",
    message: `${formatSiteCurrency(input.amount, input.currency)} was added to your wallet. You can buy activations now.`,
    link: "/dashboard?tab=wallet",
  });

  const emailContext = await getCustomerEmailContext(input.userId);
  if (!emailContext || !shouldSendCustomerDepositConfirmedEmail()) return;

  await sendDepositConfirmedEmail({
    to: emailContext.email,
    amountLabel: formatSiteCurrency(input.amount, input.currency),
    appUrl: emailContext.appUrl,
    customerName: emailContext.customerName,
  });
}

export async function notifyOrderRefunded(input: {
  userId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  toolName: string;
  hardwareId: string;
  identifierLabel?: string;
  note: string;
}) {
  const amountLabel = formatSiteCurrency(input.amount, input.currency);
  const reason = input.note.trim();

  await notifyUser({
    userId: input.userId,
    type: "order_refunded",
    title: `Order ${input.orderNumber} rejected`,
    message: `Your order for ${input.toolName} was rejected. ${amountLabel} was returned to your wallet.\n\nReason: ${reason}`,
    link: "/dashboard?tab=orders",
  });

  const emailContext = await getCustomerEmailContext(input.userId);
  if (!emailContext || !shouldSendCustomerOrderRejectedEmail()) return;

  await sendOrderRejectedEmail({
    to: emailContext.email,
    orderNumber: input.orderNumber,
    toolName: input.toolName,
    hardwareId: input.hardwareId,
    identifierLabel: input.identifierLabel,
    refundAmount: amountLabel,
    reason,
    appUrl: emailContext.appUrl,
    customerName: emailContext.customerName,
  });
}

export async function notifySupportReply(input: {
  userId: string;
  preview: string;
}) {
  const short = input.preview.length > 80 ? `${input.preview.slice(0, 80)}…` : input.preview;
  await notifyUser({
    userId: input.userId,
    type: "support_reply",
    title: "Admin replied to your message",
    message: short,
    link: "/dashboard?tab=messages",
  });
}

export async function notifyOrderProcessing(input: {
  userId: string;
  toolName: string;
  orderNumber: string;
  hardwareId: string;
  identifierLabel?: string;
  amount?: number;
  currency?: string;
}) {
  await notifyUser({
    userId: input.userId,
    type: "order_processing",
    title: `Order received: ${input.toolName}`,
    message:
      "Payment received. We're processing your activation — your key will appear in Activations when ready.",
    link: "/dashboard?tab=orders",
  });

  const emailContext = await getCustomerEmailContext(input.userId);
  if (!emailContext || !shouldSendCustomerOrderProcessingEmail()) return;

  const amountLabel =
    input.amount != null && input.currency
      ? formatSiteCurrency(input.amount, input.currency)
      : undefined;

  await sendOrderProcessingEmail({
    to: emailContext.email,
    orderNumber: input.orderNumber,
    toolName: input.toolName,
    hardwareId: input.hardwareId,
    identifierLabel: input.identifierLabel,
    amountLabel,
    appUrl: emailContext.appUrl,
    customerName: emailContext.customerName,
  });
}

export async function notifyWithdrawalCompleted(input: {
  userId: string;
  amount: number;
  currency: string;
}) {
  await notifyUser({
    userId: input.userId,
    type: "withdrawal_completed",
    title: "Withdrawal sent",
    message: `${formatSiteCurrency(input.amount, input.currency)} was sent to your payout method. Check your mobile money or crypto wallet.`,
    link: "/dashboard?tab=wallet",
  });
}

export async function notifyWithdrawalRejected(input: {
  userId: string;
  amount: number;
  currency: string;
  note?: string;
}) {
  const reason = input.note?.trim();
  await notifyUser({
    userId: input.userId,
    type: "withdrawal_rejected",
    title: "Withdrawal request declined",
    message: reason
      ? `Your withdrawal of ${formatSiteCurrency(input.amount, input.currency)} was declined. Reason: ${reason}`
      : `Your withdrawal of ${formatSiteCurrency(input.amount, input.currency)} was declined. Contact support if you need help.`,
    link: "/dashboard?tab=wallet",
  });
}
