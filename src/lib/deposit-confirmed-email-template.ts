function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDepositConfirmedEmailHtml(input: {
  amountLabel: string;
  appUrl: string;
  customerName?: string | null;
}) {
  const greeting = input.customerName ? `Hi ${escapeHtml(input.customerName)},` : "Hi,";
  const walletUrl = `${input.appUrl}/dashboard?tab=wallet`;
  const toolsUrl = `${input.appUrl}/tools`;

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
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;">Wallet deposit confirmed</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;color:#18181b;font-size:15px;">${greeting}</p>
            <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">
              Your deposit has been confirmed and added to your wallet balance.
            </p>
            <div style="margin:0 0 24px;padding:16px 20px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;text-align:center;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#059669;">Amount added</p>
              <p style="margin:0;font-size:24px;font-weight:700;color:#064e3b;">${escapeHtml(input.amountLabel)}</p>
            </div>
            <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">
              You can now browse tools and purchase activations from your wallet.
            </p>
            <a href="${toolsUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#0891b2,#7c3aed);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:10px;">Browse tools</a>
            <p style="margin:24px 0 0;color:#a1a1aa;font-size:11px;line-height:1.5;">
              View your balance anytime in <a href="${walletUrl}" style="color:#0891b2;">Dashboard → Wallet</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
