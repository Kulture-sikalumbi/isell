function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildWelcomeEmailHtml(input: {
  customerName?: string | null;
  appUrl: string;
}) {
  const greeting = input.customerName
    ? `Welcome, ${escapeHtml(input.customerName)}!`
    : "Welcome to iSell Unlocks!";
  const toolsUrl = `${input.appUrl}/tools`;
  const walletUrl = `${input.appUrl}/dashboard?tab=wallet`;
  const dashboardUrl = `${input.appUrl}/dashboard`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="padding:32px 32px 28px;background:linear-gradient(135deg,#0891b2,#7c3aed);color:#ffffff;">
            <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85;">iSell Unlocks</p>
            <h1 style="margin:10px 0 0;font-size:24px;font-weight:700;line-height:1.3;">${greeting}</h1>
            <p style="margin:12px 0 0;font-size:14px;line-height:1.6;opacity:0.9;">Your account is ready. Download tools free, pay with mobile money, and track every activation from your dashboard.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;color:#18181b;font-size:15px;font-weight:600;">Get started in 4 steps</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
                  <p style="margin:0;font-size:13px;color:#71717a;font-weight:600;">1 · Browse tools</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#3f3f46;line-height:1.5;">Download unlock tools at no cost — they run in trial mode until activated.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
                  <p style="margin:0;font-size:13px;color:#71717a;font-weight:600;">2 · Top up your wallet</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#3f3f46;line-height:1.5;">Add funds via <strong>MTN</strong>, <strong>Airtel Money</strong>, <strong>Binance Pay</strong>, or <strong>USDT (TRC20)</strong>. Pay our merchant details, then submit your proof (TID, order ID, or TxID) once.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
                  <p style="margin:0;font-size:13px;color:#71717a;font-weight:600;">3 · Activate a device</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#3f3f46;line-height:1.5;">Pick a tool, enter your <strong>IMEI</strong> (dial <code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;">*#06#</code>), and pay from your wallet balance.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;">
                  <p style="margin:0;font-size:13px;color:#71717a;font-weight:600;">4 · Collect your key</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#3f3f46;line-height:1.5;">Your activation key lands in <strong>Dashboard → Activations</strong> and we email it to you — no need to wait on the page.</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <tr>
                <td align="center" style="padding:4px;">
                  <a href="${walletUrl}" style="display:inline-block;padding:12px 20px;background:linear-gradient(135deg,#0891b2,#7c3aed);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:10px;">Add funds to wallet</a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:4px;">
                  <a href="${toolsUrl}" style="display:inline-block;padding:12px 20px;background:#f4f4f5;color:#18181b;text-decoration:none;font-size:14px;font-weight:600;border-radius:10px;border:1px solid #e4e4e7;">Browse tools</a>
                </td>
              </tr>
            </table>

            <p style="margin:20px 0 0;color:#71717a;font-size:13px;line-height:1.6;text-align:center;">
              Need help? Open <a href="${dashboardUrl}?tab=messages" style="color:#0891b2;">Support</a> in your dashboard — we reply quickly.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#fafafa;border-top:1px solid #f4f4f5;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.5;">You received this once because you joined iSell Unlocks. Keep this email for your records.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
