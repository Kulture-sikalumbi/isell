function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildOrderProcessingEmailHtml(input: {
  orderNumber: string;
  toolName: string;
  hardwareId: string;
  identifierLabel?: string;
  amountLabel?: string;
  appUrl: string;
  customerName?: string | null;
}) {
  const greeting = input.customerName ? `Hi ${escapeHtml(input.customerName)},` : "Hi,";
  const idLabel = escapeHtml(input.identifierLabel ?? "Device ID");
  const ordersUrl = `${input.appUrl}/dashboard?tab=orders`;

  const amountRow = input.amountLabel
    ? `<tr>
        <td style="padding:12px 16px;">
          <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Amount</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#18181b;">${escapeHtml(input.amountLabel)}</p>
        </td>
      </tr>`
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
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;">Order received</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;color:#18181b;font-size:15px;">${greeting}</p>
            <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">
              Payment received. We are processing your activation and will email your key when it is ready.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;">
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e4e4e7;">
                  <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Order</p>
                  <p style="margin:4px 0 0;font-family:ui-monospace,monospace;font-size:14px;font-weight:600;color:#18181b;">${escapeHtml(input.orderNumber)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e4e4e7;">
                  <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Tool</p>
                  <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#18181b;">${escapeHtml(input.toolName)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;${amountRow ? "border-bottom:1px solid #e4e4e7;" : ""}">
                  <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${idLabel}</p>
                  <p style="margin:4px 0 0;font-family:ui-monospace,monospace;font-size:13px;color:#3f3f46;word-break:break-all;">${escapeHtml(input.hardwareId)}</p>
                </td>
              </tr>
              ${amountRow}
            </table>
            <a href="${ordersUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0891b2,#7c3aed);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:10px;">View your orders</a>
            <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;line-height:1.5;">
              Your activation key will also appear in Dashboard → Activations when ready.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
