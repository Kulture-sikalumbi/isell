import { getAdminEmails } from "@/lib/auth";

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "iSell Unlocks <onboarding@resend.dev>";
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).filter(Boolean);

  if (recipients.length === 0) {
    console.info("[email] Skipped (no recipients):", input.subject);
    return false;
  }

  if (!apiKey) {
    console.info("[email] Skipped (no RESEND_API_KEY):", input.subject, "→", recipients.join(", "));
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!res.ok) {
      console.error("[email] Failed:", await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Error:", err);
    return false;
  }
}

/** Send to every profile with role = admin (set in Supabase after Google sign-in) */
export async function sendEmailToAdmins(input: {
  subject: string;
  html: string;
}): Promise<boolean> {
  const admins = await getAdminEmails();
  if (admins.length === 0) {
    console.info("[email] Skipped (no admin accounts in database):", input.subject);
    return false;
  }

  return sendEmail({ ...input, to: admins });
}

export async function sendAdminOrderEmail(input: {
  toolName: string;
  hardwareId: string;
  amount: string;
  reference: string;
  appUrl: string;
}) {
  return sendEmailToAdmins({
    subject: `New order — ${input.toolName}`,
    html: `
      <h2>New activation order</h2>
      <p><strong>Tool:</strong> ${input.toolName}</p>
      <p><strong>IMEI / ID:</strong> ${input.hardwareId}</p>
      <p><strong>Amount:</strong> ${input.amount}</p>
      <p><strong>Reference:</strong> ${input.reference}</p>
      <p><a href="${input.appUrl}/admin/payments">Process in admin panel →</a></p>
    `,
  });
}
