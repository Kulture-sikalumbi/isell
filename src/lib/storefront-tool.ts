import { getCheckoutTotal } from "@/lib/platform-fee";
import type { Tool } from "@/types/database";

/** Tool fields safe to expose on the storefront (no fee % or wholesale). */
export type StorefrontTool = Omit<Tool, "platform_fee_percent" | "wholesale_cost"> & {
  checkout_price: number;
};

export function toStorefrontTool(tool: Tool): StorefrontTool {
  const { platform_fee_percent: _fee, wholesale_cost: _cost, ...publicTool } = tool;
  return {
    ...publicTool,
    checkout_price: getCheckoutTotal(tool),
  };
}

export function toStorefrontTools(tools: Tool[]): StorefrontTool[] {
  return tools.map(toStorefrontTool);
}

/** Hide platform fee rows; merge fee into the related purchase line. */
export function mergeWalletTransactionsForCustomer<
  T extends { type: string; amount: number; payment_id: string | null },
>(transactions: T[]): T[] {
  const feeByPayment = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type === "platform_fee" && tx.payment_id) {
      feeByPayment.set(tx.payment_id, tx.amount);
    }
  }

  return transactions
    .filter((tx) => tx.type !== "platform_fee")
    .map((tx) => {
      if (tx.type !== "purchase" || !tx.payment_id) return tx;
      const fee = feeByPayment.get(tx.payment_id);
      if (!fee) return tx;
      return { ...tx, amount: tx.amount + fee };
    });
}
