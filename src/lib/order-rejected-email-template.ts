function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildOrderRejectedEmailHtml(input: {
  orderNumber: string;
  toolName: string;
  hardwareId: string;
  identifierLabel?: string;
  refundAmount: string;
  reason: string;
  appUrl: string;
  customerName?: string | null;
}) {
  const ordersUrl = `${input.appUrl}/dashboard?tab=orders`;
  const walletUrl = `${input.appUrl}/dashboard?tab=wallet`;
  const greeting = input.customerName ? `Hi ${escapeHtml(input.customerName)},` : "Hi,";
  const idLabel = escapeHtml(input.identifierLabel ?? "Device ID");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="padding:32px 32px 28px;background:linear-gradient(135deg,#b91c1c,#7f1d1d);color:#ffffff;">
            <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85;">iSell Unlocks</p>
            <h1 style="margin:10px 0 0;font-size:22px;font-weight:700;line-height:1.3;">Order rejected</h1>
            <p style="margin:12px 0 0;font-size:14px;line-height:1.6;opacity:0.9;">Your order could not be fulfilled. The payment has been returned to your wallet.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#18181b;font-size:15px;line-height:1.6;">${greeting}</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;">
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #e4e4e7;">
                  <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Order</p>
                  <p style="margin:4px 0 0;font-family:ui-monospace,monospace;font-size:14px;font-weight:600;color:#18181b;">${escapeHtml(input.orderNumber)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #e4e4e7;">
                  <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Tool</p>
                  <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#18181b;">${escapeHtml(input.toolName)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;border-bottom:1px solid #e4e4e7;">
                  <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${idLabel}</p>
                  <p style="margin:4px 0 0;font-family:ui-monospace,monospace;font-size:13px;color:#3f3f46;word-break:break-all;">${escapeHtml(input.hardwareId)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 16px;">
                  <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Refunded to wallet</p>
                  <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#059669;">${escapeHtml(input.refundAmount)}</p>
                </td>
              </tr>
            </table>

            <div style="margin-bottom:24px;padding:16px 18px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#b91c1c;">Reason from our team</p>
              <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.reason)}</p>
            </div>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="border-radius:10px;background:#18181b;">
                  <a href="${ordersUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View your orders</a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;text-align:center;font-size:13px;color:#71717a;">
              Funds are in your <a href="${walletUrl}" style="color:#0891b2;text-decoration:none;">wallet</a> — you can place a new order anytime.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.5;text-align:center;">Questions? Reply from your dashboard Messages tab or contact support.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
