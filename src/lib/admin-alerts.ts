/**
 * Outbound admin alerts (WhatsApp, SMS) — configure via env when ready.
 *
 * WhatsApp (later): Meta Cloud API or Twilio
 *   ADMIN_WHATSAPP_TO=26097xxxxxxx
 *   WHATSAPP_API_URL=https://...
 *   WHATSAPP_API_TOKEN=...
 *
 * SMS (later): Twilio / Africa's Talking
 *   SMS_API_URL=...
 *   SMS_API_TOKEN=...
 */

import { formatSiteCurrency } from "@/lib/currency";

export async function sendAdminWhatsAppAlert(input: {
  title: string;
  body: string;
  link?: string;
}): Promise<boolean> {
  const to = process.env.ADMIN_WHATSAPP_TO?.trim();
  const apiUrl = process.env.WHATSAPP_API_URL?.trim();
  const token = process.env.WHATSAPP_API_TOKEN?.trim();

  const message = input.link ? `${input.body}\n\n${input.link}` : input.body;

  if (!to || !apiUrl || !token) {
    console.info("[whatsapp] Skipped (set ADMIN_WHATSAPP_TO, WHATSAPP_API_URL, WHATSAPP_API_TOKEN):", input.title);
    return false;
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        type: "text",
        text: { body: message },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp] Failed:", await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[whatsapp] Error:", err);
    return false;
  }
}

export async function sendAdminSmsAlert(input: {
  body: string;
}): Promise<boolean> {
  const to = process.env.ADMIN_SMS_TO?.trim();
  const apiUrl = process.env.SMS_API_URL?.trim();
  const token = process.env.SMS_API_TOKEN?.trim();

  if (!to || !apiUrl || !token) {
    console.info("[sms] Skipped (set ADMIN_SMS_TO, SMS_API_URL, SMS_API_TOKEN)");
    return false;
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, message: input.body }),
    });

    if (!res.ok) {
      console.error("[sms] Failed:", await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[sms] Error:", err);
    return false;
  }
}

export async function alertAdminNewOrder(input: {
  toolName: string;
  hardwareId: string;
  amount: number;
  currency: string;
  reference: string;
  appUrl: string;
}) {
  const amountLabel = formatSiteCurrency(input.amount, input.currency);
  const adminLink = `${input.appUrl}/admin/payments`;

  const body =
    `🛒 New order — ${input.toolName}\n` +
    `ID: ${input.hardwareId}\n` +
    `Amount: ${amountLabel}\n` +
    `Ref: ${input.reference}`;

  await Promise.all([
    sendAdminWhatsAppAlert({
      title: "New order",
      body,
      link: adminLink,
    }),
    sendAdminSmsAlert({
      body: `iSell: New order ${input.toolName} ${amountLabel}. Fulfill: ${adminLink}`,
    }),
  ]);
}
