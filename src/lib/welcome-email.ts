import { sendWelcomeEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/user-notifications";

/** Send welcome email + in-app tip once per customer account. Skips admins. */
export async function sendWelcomeEmailIfNeeded(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  if (!supabase || !userId) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role, welcome_email_sent_at")
    .eq("id", userId)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "user" ||
    profile.welcome_email_sent_at ||
    !profile.email?.trim()
  ) {
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const customerName = profile.full_name?.trim() || null;
  const email = profile.email.trim();

  const sent = await sendWelcomeEmail({
    to: email,
    customerName,
    appUrl,
  });

  if (!sent) {
    console.error("[welcome-email] Resend failed for", email);
    return false;
  }

  const { data: claimed } = await supabase
    .from("profiles")
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("role", "user")
    .is("welcome_email_sent_at", null)
    .select("id")
    .maybeSingle();

  if (!claimed) return false;

  await notifyUser({
    userId,
    type: "welcome",
    title: "Welcome to iSell Unlocks",
    message:
      "Top up your wallet with MTN or Airtel, pick a tool, and activate with your IMEI — your key appears in Activations.",
    link: "/dashboard?tab=wallet",
  });

  return true;
}
