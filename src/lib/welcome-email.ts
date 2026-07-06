import { sendWelcomeEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/user-notifications";

/** Send welcome email + in-app tip once per customer account. Skips admins. */
export async function sendWelcomeEmailIfNeeded(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  if (!supabase || !userId) return false;

  const { data: claimed } = await supabase
    .from("profiles")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("role", "user")
    .is("welcome_email_sent_at", null)
    .select("email, full_name")
    .maybeSingle();

  if (!claimed?.email?.trim()) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const customerName = claimed.full_name?.trim() || null;

  await notifyUser({
    userId,
    type: "welcome",
    title: "Welcome to iSell Unlocks",
    message:
      "Top up your wallet with MTN or Airtel, pick a tool, and activate with your IMEI — your key appears in Activations.",
    link: "/dashboard?tab=wallet",
  });

  return sendWelcomeEmail({
    to: claimed.email.trim(),
    customerName,
    appUrl,
  });
}
