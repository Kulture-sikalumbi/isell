import { createServiceClient } from "@/lib/supabase/server";
import { sendEmailToAdmins } from "@/lib/email";

export async function notifyAdminToolRequest(input: {
  requestedName: string;
  notes?: string;
  userEmail?: string;
  userId?: string;
}) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data: request } = await supabase
    .from("tool_requests")
    .insert({
      user_id: input.userId ?? null,
      user_email: input.userEmail ?? null,
      requested_name: input.requestedName,
      notes: input.notes ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (!request) return null;

  const title = `Tool request: ${input.requestedName}`;
  const message = [
    input.userEmail ? `From: ${input.userEmail}` : "From: guest",
    input.notes ? `Notes: ${input.notes}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  await supabase.from("admin_notifications").insert({
    type: "tool_request",
    title,
    message,
    payment_id: null,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await sendEmailToAdmins({
    subject: title,
    html: `
      <h2>Customer requested a new tool</h2>
      <p><strong>Tool:</strong> ${input.requestedName}</p>
      ${input.userEmail ? `<p><strong>Email:</strong> ${input.userEmail}</p>` : ""}
      ${input.notes ? `<p><strong>Notes:</strong> ${input.notes}</p>` : ""}
      <p><a href="${appUrl}/admin/inbox">View inbox →</a></p>
    `,
  });

  return request;
}
