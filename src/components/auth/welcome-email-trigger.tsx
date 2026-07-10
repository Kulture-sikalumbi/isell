import { sendWelcomeEmailIfNeeded } from "@/lib/welcome-email";
import { getCurrentUser } from "@/lib/auth";

/** Runs on authenticated store pages — backup if post-login missed the welcome email. */
export async function WelcomeEmailTrigger() {
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    await sendWelcomeEmailIfNeeded(user.id, {
      email: user.email ?? undefined,
      fullName:
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined),
    });
  } catch (err) {
    console.error("[welcome-email]", err);
  }

  return null;
}
