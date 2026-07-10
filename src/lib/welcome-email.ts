import { sendWelcomeEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/user-notifications";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface WelcomeAuthHint {
  email?: string;
  fullName?: string;
}

async function loadWelcomeProfile(userId: string, hint?: WelcomeAuthHint) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, role, welcome_email_sent_at")
      .eq("id", userId)
      .maybeSingle();

    if (profile) return profile;

    if (attempt < 5) await sleep(300);
  }

  const email = hint?.email?.trim();
  if (!email) return null;

  const fullName = hint?.fullName?.trim() || null;

  return {
    email,
    full_name: fullName,
    role: "user" as const,
    welcome_email_sent_at: null,
  };
}

/** Send welcome email + in-app tip once per customer account. Skips admins. */
export async function sendWelcomeEmailIfNeeded(
  userId: string,
  hint?: WelcomeAuthHint
): Promise<boolean> {
  const supabase = createServiceClient();
  if (!supabase || !userId) return false;

  const profile = await loadWelcomeProfile(userId, hint);

  if (
    !profile ||
    profile.role !== "user" ||
    profile.welcome_email_sent_at ||
    !profile.email?.trim()
  ) {
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const customerName = profile.full_name?.trim() || hint?.fullName?.trim() || null;
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
