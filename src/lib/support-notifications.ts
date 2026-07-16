import { createServiceClient } from "@/lib/supabase/server";
import { sendEmailToAdmins } from "@/lib/email";
import { getServerEmailEnv } from "@/lib/runtime-env";

export async function notifyAdminSupportMessage(input: {
  userId: string;
  userEmail: string;
  userName?: string;
  preview: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return;

  const title = `Message from ${input.userName || input.userEmail}`;
  const message = input.preview.slice(0, 200);

  await supabase.from("admin_notifications").insert({
    type: "support_message",
    title,
    message: `${input.userEmail}: ${message}`,
    payment_id: null,
  });

  const appUrl = getServerEmailEnv().appUrl || "http://localhost:3000";
  await sendEmailToAdmins({
    subject: title,
    html: `
      <p><strong>${input.userEmail}</strong> sent a message:</p>
      <p>${message}</p>
      <p><a href="${appUrl}/admin/messages?user=${input.userId}">Reply in admin →</a></p>
    `,
  });
}
