import { getAdminEmails } from "@/lib/auth";
import { buildActivationReadyEmailHtml } from "@/lib/activation-email-template";
import { buildDepositConfirmedEmailHtml } from "@/lib/deposit-confirmed-email-template";
import { buildOrderProcessingEmailHtml } from "@/lib/order-processing-email-template";
import { buildOrderRejectedEmailHtml } from "@/lib/order-rejected-email-template";
import { buildWelcomeEmailHtml } from "@/lib/welcome-email-template";
import { getCustomerIdentifierLabel } from "@/lib/identifier-label";
import { getServerEmailEnv } from "@/lib/runtime-env";
import { sendViaResendHttps } from "@/lib/resend-client";

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
  skipped?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { apiKey, from, replyTo } = getServerEmailEnv();
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).filter(Boolean);

  if (recipients.length === 0) {
    const skipped = "no recipients";
    console.info("[email] Skipped (no recipients):", input.subject);
    return { ok: false, skipped };
  }

  if (!apiKey) {
    const skipped = "RESEND_API_KEY missing on server";
    console.info("[email] Skipped (no RESEND_API_KEY):", input.subject, "→", recipients.join(", "));
    return { ok: false, skipped };
  }

  const payload = {
    from,
    reply_to: replyTo || undefined,
    to: recipients,
    subject: input.subject,
    html: input.html,
    text: htmlToText(input.html),
  };

  const httpsResult = await sendViaResendHttps({
    apiKey,
    ...payload,
  });

  if (httpsResult.ok) {
    return { ok: true };
  }

  console.error("[email] HTTPS send failed:", httpsResult.error);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Fetch fallback failed:", body);
      return { ok: false, error: body || httpsResult.error };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Fetch error:", err);
    return { ok: false, error: message || httpsResult.error };
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

  return sendEmail({ ...input, to: admins }).then((r) => r.ok);
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

export async function sendActivationReadyEmail(input: {
  to: string;
  toolName: string;
  toolDescription?: string | null;
  hardwareId: string;
  identifierLabel?: string;
  activationCode: string;
  appUrl: string;
  customerName?: string | null;
}) {
  const result = await sendEmail({
    to: input.to,
    subject: `Your activation key is ready — ${input.toolName}`,
    html: buildActivationReadyEmailHtml({
      toolName: input.toolName,
      toolDescription: input.toolDescription,
      hardwareId: input.hardwareId,
      identifierLabel: getCustomerIdentifierLabel(input.identifierLabel),
      activationCode: input.activationCode,
      appUrl: input.appUrl,
      customerName: input.customerName,
    }),
  });
  return result.ok;
}

export async function sendOrderRejectedEmail(input: {
  to: string;
  orderNumber: string;
  toolName: string;
  hardwareId: string;
  identifierLabel?: string;
  refundAmount: string;
  reason: string;
  appUrl: string;
  customerName?: string | null;
}) {
  const result = await sendEmail({
    to: input.to,
    subject: `Order ${input.orderNumber} rejected — refund issued`,
    html: buildOrderRejectedEmailHtml({
      orderNumber: input.orderNumber,
      toolName: input.toolName,
      hardwareId: input.hardwareId,
      identifierLabel: getCustomerIdentifierLabel(input.identifierLabel),
      refundAmount: input.refundAmount,
      reason: input.reason,
      appUrl: input.appUrl,
      customerName: input.customerName,
    }),
  });
  return result.ok;
}

export async function sendWelcomeEmail(input: {
  to: string;
  customerName?: string | null;
  appUrl: string;
}): Promise<boolean> {
  const result = await sendEmail({
    to: input.to,
    subject: "Welcome to iSell Unlocks — here's how to get started",
    html: buildWelcomeEmailHtml({
      customerName: input.customerName,
      appUrl: input.appUrl,
    }),
  });
  return result.ok;
}

export async function sendDepositConfirmedEmail(input: {
  to: string;
  amountLabel: string;
  appUrl: string;
  customerName?: string | null;
}) {
  const result = await sendEmail({
    to: input.to,
    subject: "Your wallet deposit is confirmed",
    html: buildDepositConfirmedEmailHtml({
      amountLabel: input.amountLabel,
      appUrl: input.appUrl,
      customerName: input.customerName,
    }),
  });
  return result.ok;
}

export async function sendOrderProcessingEmail(input: {
  to: string;
  orderNumber: string;
  toolName: string;
  hardwareId: string;
  identifierLabel?: string;
  amountLabel?: string;
  appUrl: string;
  customerName?: string | null;
}) {
  const result = await sendEmail({
    to: input.to,
    subject: `Order received: ${input.toolName}`,
    html: buildOrderProcessingEmailHtml({
      orderNumber: input.orderNumber,
      toolName: input.toolName,
      hardwareId: input.hardwareId,
      identifierLabel: input.identifierLabel,
      amountLabel: input.amountLabel,
      appUrl: input.appUrl,
      customerName: input.customerName,
    }),
  });
  return result.ok;
}
