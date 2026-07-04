import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { LedgerSummary } from "@/lib/ledger";

interface LedgerViewProps {
  ledger: LedgerSummary;
}

const typeLabels = {
  payment_in: { label: "Mobile money in", variant: "success" as const },
  payout: { label: "Payout", variant: "warning" as const },
  adjustment: { label: "Adjustment", variant: "info" as const },
};

export function LedgerView({ ledger }: LedgerViewProps) {
  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-6">
          <p className="text-xs text-zinc-500 mb-1">Account balance</p>
          <p className="text-3xl font-bold text-emerald-400">
            {formatCurrency(ledger.balance, ledger.currency)}
          </p>
          <p className="text-xs text-zinc-600 mt-2">Available from completed payments</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-xs text-zinc-500 mb-1">Total received</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(ledger.totalIn, ledger.currency)}
          </p>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-xs text-zinc-500 mb-1">Total out / adjustments</p>
          <p className="text-2xl font-bold text-zinc-300">
            {formatCurrency(ledger.totalOut, ledger.currency)}
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white">Transaction ledger</h2>
        </div>
        {ledger.entries.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">
            No ledger entries yet. Completed mobile money payments appear here automatically.
          </div>
        ) : (
          <table className="w-full text-sm">
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
                    <td className="px-6 py-3 text-zinc-500">
                      {formatDate(e.created_at)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </td>
                    <td className="px-6 py-3 text-zinc-300">
                      {e.description ?? "—"}
                    </td>
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
        )}
      </div>
    </div>
  );
}
