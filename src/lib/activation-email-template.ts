function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildActivationReadyEmailHtml(input: {
  toolName: string;
  toolDescription?: string | null;
  hardwareId: string;
  identifierLabel?: string;
  activationCode: string;
  appUrl: string;
  customerName?: string | null;
}) {
  const activationsUrl = `${input.appUrl}/dashboard?tab=activations`;
  const isRegistered = input.activationCode === "DEVICE_REGISTERED";
  const idLabel = input.identifierLabel ?? "IMEI";
  const greeting = input.customerName ? `Hi ${escapeHtml(input.customerName)},` : "Hi,";

  const keyBlock = isRegistered
    ? `<p style="margin:0;color:#065f46;font-size:14px;line-height:1.6;">Your device has been registered on our server. Open the tool on your device to continue.</p>`
    : `<div style="margin:16px 0;padding:16px 20px;background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #6ee7b7;border-radius:12px;text-align:center;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#059669;">Your activation key</p>
        <p style="margin:0;font-family:ui-monospace,monospace;font-size:22px;font-weight:700;letter-spacing:0.08em;color:#064e3b;word-break:break-all;">${escapeHtml(input.activationCode)}</p>
      </div>`;

  const descriptionBlock = input.toolDescription
    ? `<p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">${escapeHtml(input.toolDescription)}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="padding:28px 32px;background:linear-gradient(135deg,#0891b2,#7c3aed);color:#ffffff;">
            <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85;">iSell Unlocks</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;">Your activation is ready</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;color:#18181b;font-size:15px;">${greeting}</p>
            <p style="margin:0 0 8px;color:#18181b;font-size:16px;font-weight:600;">${escapeHtml(input.toolName)}</p>
            ${descriptionBlock}
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;">
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#71717a;">${escapeHtml(idLabel)}</td>
                <td style="padding:12px 16px;font-size:13px;font-family:ui-monospace,monospace;color:#18181b;text-align:right;">${escapeHtml(input.hardwareId)}</td>
              </tr>
            </table>
            ${keyBlock}
            <p style="margin:20px 0 16px;color:#52525b;font-size:14px;line-height:1.6;">Your key is also saved in your account under <strong>Dashboard → Activations</strong>.</p>
            <a href="${activationsUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0891b2,#7c3aed);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:10px;">View in dashboard</a>
            <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;line-height:1.5;">Keep this key private. If you did not place this order, contact support via your dashboard.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
