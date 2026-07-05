import { Badge } from "@/components/ui/badge";
import { AdminLedgerActions } from "@/components/admin/admin-ledger-actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MerchantAccountingSummary } from "@/lib/ledger";

interface LedgerViewProps {
  ledger: MerchantAccountingSummary;
}

const typeLabels = {
  payment_in: { label: "Money in", variant: "success" as const },
  payout: { label: "Withdrawal", variant: "warning" as const },
  adjustment: { label: "Adjustment", variant: "info" as const },
};

export function LedgerView({ ledger }: LedgerViewProps) {
  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-6 border border-emerald-500/10">
          <p className="text-xs text-zinc-500 mb-1">Processed sales</p>
          <p className="text-3xl font-bold text-emerald-300">
            {formatCurrency(ledger.processedSalesVolume, ledger.currency)}
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            {ledger.walletOrderCount} completed wallet purchase
            {ledger.walletOrderCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="glass rounded-2xl p-6 border border-cyan-500/10">
          <p className="text-xs text-zinc-500 mb-1">Customer prepaid balance</p>
          <p className="text-2xl font-bold text-cyan-300">
            {formatCurrency(ledger.customerWalletLiability, ledger.currency)}
          </p>
          <p className="text-xs text-zinc-600 mt-2">Still owed to customers — not your revenue</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-xs text-zinc-500 mb-1">Deposits confirmed</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(ledger.depositsReceivedTotal, ledger.currency)}
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            {ledger.depositCount} deposit{ledger.depositCount !== 1 ? "s" : ""} — held for customers
          </p>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-xs text-zinc-500 mb-1">Platform fees earned</p>
          <p className="text-2xl font-bold text-amber-300">
            {formatCurrency(ledger.platformFeesEarned, ledger.currency)}
          </p>
          <p className="text-xs text-zinc-600 mt-2">Your fee on each wallet order</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-zinc-500 space-y-1">
        <p>
          <strong className="text-zinc-400">Header shows processed sales</strong> — money from
          completed tool purchases, not customer deposits.
        </p>
        <p>
          Reconciliation: deposits confirmed (
          {formatCurrency(ledger.depositsReceivedTotal, ledger.currency)}) minus customer prepaid
          still unused ({formatCurrency(ledger.customerWalletLiability, ledger.currency)}) ≈{" "}
          <span className="text-zinc-300">
            {formatCurrency(
              ledger.depositsReceivedTotal - ledger.customerWalletLiability,
              ledger.currency
            )}
          </span>{" "}
          already spent on tools. Ledger cash tracked:{" "}
          {formatCurrency(ledger.balance, ledger.currency)} (deposits in − withdrawals out).
        </p>
      </div>

      <AdminLedgerActions currency={ledger.currency} trackedBalance={ledger.balance} />

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-white">Transaction ledger</h2>
          <Badge variant="info">{ledger.entries.length} recent</Badge>
        </div>
        {ledger.entries.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">
            No ledger entries yet. Confirmed customer deposits and recorded withdrawals appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/5 text-left text-zinc-500">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.entries.map((e) => {
                  const meta = typeLabels[e.entry_type];
                  const isCredit = e.entry_type === "payment_in";
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-3 text-zinc-500">{formatDate(e.created_at)}</td>
                      <td className="px-6 py-3">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td className="px-6 py-3 text-zinc-300">{e.description ?? "—"}</td>
                      <td
                        className={`px-6 py-3 text-right font-medium ${
                          isCredit ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
                        {formatCurrency(e.amount, e.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
