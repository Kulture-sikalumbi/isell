import { getUserEmail } from "@/lib/auth";
import { sendActivationReadyEmail } from "@/lib/email";
import { formatSiteCurrency } from "@/lib/currency";
import { createServiceClient } from "@/lib/supabase/server";

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

  const email = await getUserEmail(input.userId);
  if (!email) return;

  const supabase = createServiceClient();
  let customerName: string | null = null;
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", input.userId)
      .single();
    customerName = data?.full_name ?? null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await sendActivationReadyEmail({
    to: email,
    toolName: input.toolName,
    toolDescription: input.toolDescription,
    hardwareId: input.hardwareId,
    identifierLabel: input.identifierLabel,
    activationCode: input.activationCode,
    appUrl,
    customerName,
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
}

export async function notifyOrderRefunded(input: {
  userId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  toolName: string;
  note?: string;
}) {
  const amountLabel = formatSiteCurrency(input.amount, input.currency);
  const reason = input.note?.trim() ? ` Reason: ${input.note.trim()}` : "";
  await notifyUser({
    userId: input.userId,
    type: "order_refunded",
    title: `Order ${input.orderNumber} refunded`,
    message: `Your order for ${input.toolName} was rejected. ${amountLabel} was returned to your wallet.${reason}`,
    link: "/dashboard?tab=wallet",
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
}) {
  await notifyUser({
    userId: input.userId,
    type: "order_processing",
    title: `Order received: ${input.toolName}`,
    message: "Payment received. We're processing your activation — we'll email your key and add it to Activations when ready.",
    link: "/dashboard?tab=orders",
  });
}
