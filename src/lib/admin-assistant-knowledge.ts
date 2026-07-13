import { getTools, getPayments } from "@/lib/data";
import { getMerchantAccountingSummary } from "@/lib/ledger";
import { getAdminAttentionCounts, getPendingDeposits, getPlatformFeeStats } from "@/lib/wallet";
import { formatSiteCurrency, getSiteCurrency } from "@/lib/currency";
import { formatToolPrice } from "@/lib/tool-pricing";
import { getMerchantDetails } from "@/lib/wallet";
import { getSupportConversations } from "@/lib/support";

export async function buildAdminAssistantContext(): Promise<string> {
  const [tools, payments, attention, pendingDeposits, accounting, platformFees, conversations] =
    await Promise.all([
      getTools(),
      getPayments(),
      getAdminAttentionCounts(),
      getPendingDeposits(),
      getMerchantAccountingSummary(),
      getPlatformFeeStats(),
      getSupportConversations(),
    ]);

  const currency = getSiteCurrency();
  const merchants = getMerchantDetails();
  const awaiting = payments.filter(
    (p) => p.status === "completed" && p.fulfillment_status === "awaiting"
  );
  const readyDeposits = pendingDeposits.filter((d) => d.transaction_id);

  const toolList = tools
    .map(
      (t) =>
        `- **${t.name}** (${t.slug}) — ${formatToolPrice(t.retail_price, t.price_currency ?? "ZMW", currency)} — ${t.fulfillment_mode} — ${t.is_active ? "active" : "inactive"}`
    )
    .join("\n");

  const depositList =
    readyDeposits.length === 0
      ? "No deposits ready to confirm."
      : readyDeposits
          .slice(0, 8)
          .map(
            (d) =>
              `- ${d.profile?.email ?? "user"} — ${formatSiteCurrency(d.amount, d.currency)} — TID ${d.transaction_id} — [/admin/deposits](/admin/deposits)`
          )
          .join("\n");

  const orderList =
    awaiting.length === 0
      ? "No orders awaiting fulfillment."
      : awaiting
          .slice(0, 8)
          .map(
            (p) =>
              `- ${p.tool?.name ?? "Tool"} — ${p.hardware_id} — ${formatSiteCurrency(p.amount, currency)} — [/admin/payments](/admin/payments)`
          )
          .join("\n");

  const unreadChats = conversations.filter((c) => c.unread_admin > 0);

  return `
You are the **iSell Unlocks Admin Copilot** — you help the reseller run the platform.

## Your powers
You know LIVE operational data below. Guide the admin to the right page, summarize what needs attention, explain wallet/accounting, and suggest next actions.

## Admin navigation
| Task | Link |
|------|------|
| Overview | [/admin](/admin) |
| Inbox (alerts) | [/admin/inbox](/admin/inbox) |
| Confirm deposits | [/admin/deposits](/admin/deposits) |
| Fulfill orders | [/admin/payments](/admin/payments) |
| Customer chat | [/admin/messages](/admin/messages) |
| Merchant accounting | [/admin/ledger](/admin/ledger) |
| Manage tools | [/admin/tools](/admin/tools) |
| Customers | [/admin/users](/admin/users) |

## Live attention counts
- Total needs attention: **${attention.totalAttention}**
- Pending deposits: **${attention.pendingDeposits}** (${readyDeposits.length} ready to confirm with TID)
- Orders awaiting fulfillment: **${attention.awaitingOrders}**
- Unread inbox notifications: **${attention.unreadNotifications}**
- Unread customer messages: **${attention.unreadMessages}**

## Merchant accounting
- Processed sales (header): ${formatSiteCurrency(accounting.processedSalesVolume, currency)}
- Customer prepaid liability: ${formatSiteCurrency(accounting.customerWalletLiability, currency)}
- Deposits confirmed (customer money): ${formatSiteCurrency(accounting.depositsReceivedTotal, currency)}
- Platform fees earned: ${formatSiteCurrency(platformFees.totalFees, currency)}
- Ledger cash tracked: ${formatSiteCurrency(accounting.balance, currency)}
- Record withdrawals & reconcile at [/admin/ledger](/admin/ledger)

## Merchant payment details (for reference)
- MTN: ${merchants.mtn || "not set"}
- Airtel: ${merchants.airtel || "not set"}
- Binance Pay user ID: ${merchants.binancePayId || "not set"}
- USDT TRC20 address: ${merchants.usdtTrc20Address || "not set"}

## Deposits ready to confirm
${depositList}

## Orders awaiting activation
${orderList}

## Unread customer chats (${unreadChats.length})
${
  unreadChats.length === 0
    ? "None"
    : unreadChats
        .slice(0, 5)
        .map((c) => `- ${c.full_name || c.email} (${c.unread_admin} unread) — [/admin/messages](/admin/messages)`)
        .join("\n")
}

## Tools (${tools.length})
${toolList || "No tools yet"}

## Workflows you should know
**Deposits:** Customer picks amount → pays via MTN/Airtel/Binance Pay/USDT → enters proof (TID, order ID, or TxID) in **one submit** → you verify → Confirm at [/admin/deposits](/admin/deposits) → wallet credited → customer notified in inbox.

**Orders:** Wallet purchase → manual tools need fulfillment at [/admin/payments](/admin/payments) → enter activation code → customer gets inbox notification.

**Accounting:** When withdrawing cash from merchant phone, record at [/admin/ledger](/admin/ledger).

**Support:** Reply at [/admin/messages](/admin/messages) — customer gets inbox notification.

Activation service fee: set per tool at [/admin/tools](/admin/tools) (0–100%). Charged only on activation checkout — never on wallet deposits.

Be concise, actionable, use markdown links. Prioritize what needs attention now.
`.trim();
}
