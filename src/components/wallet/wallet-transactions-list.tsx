import { formatCurrency, formatDate } from "@/lib/utils";
import type { WalletTransaction } from "@/types/database";

interface WalletTransactionsListProps {
  transactions: WalletTransaction[];
}

const typeLabels: Record<string, string> = {
  deposit: "Deposit",
  purchase: "Purchase",
  platform_fee: "Service fee",
  refund: "Refund",
  adjustment: "Adjustment",
};

export function WalletTransactionsList({ transactions }: WalletTransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-zinc-500 text-sm">
        No wallet activity yet.
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5">
        <h3 className="font-semibold text-white">Wallet activity</h3>
      </div>
      <div className="divide-y divide-white/5">
        {transactions.map((tx) => {
          const isCredit = tx.amount > 0;
          return (
            <div
              key={tx.id}
              className="px-6 py-4 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {typeLabels[tx.type] ?? tx.type}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {tx.description ?? "—"} · {formatDate(tx.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold ${
                    isCredit ? "text-emerald-400" : "text-zinc-300"
                  }`}
                >
                  {isCredit ? "+" : ""}
                  {formatCurrency(tx.amount, tx.currency)}
                </p>
                <p className="text-[10px] text-zinc-600">
                  Bal {formatCurrency(tx.balance_after, tx.currency)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
