import { getCurrentProfile } from "@/lib/auth";
import { SiteAssistant } from "@/components/assistant/site-assistant";

/** Customer AI assistant — hidden for admins (they have Admin Copilot). */
export async function StoreAssistantGate() {
  const profile = await getCurrentProfile();
  if (profile?.role === "admin") return null;
  return <SiteAssistant />;
}
