import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { WalletDeposit } from "@/types/database";

interface PendingDepositsListProps {
  deposits: WalletDeposit[];
}

const methodLabels = {
  mtn: "MTN",
  airtel: "Airtel",
  binance: "Binance",
  other: "Other",
};

function statusMeta(deposit: WalletDeposit) {
  if (deposit.status === "pending") {
    return {
      label: "Processing",
      variant: "info" as const,
      hint: "Admin is verifying your payment. Balance updates after confirmation.",
    };
  }
  if (deposit.status === "confirmed") {
    return {
      label: "Confirmed",
      variant: "success" as const,
      hint: "Credited to your wallet.",
    };
  }
  return {
    label: "Rejected",
    variant: "danger" as const,
    hint: deposit.admin_note || "Contact admin if you believe this is an error.",
  };
}

export function PendingDepositsList({ deposits }: PendingDepositsListProps) {
  const relevant = deposits.filter(
    (d) =>
      (d.status === "pending" && d.transaction_id) ||
      d.status === "rejected"
  );

  if (relevant.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-white">Your deposits</h3>
      <div className="space-y-3">
        {relevant.map((d) => {
          const meta = statusMeta(d);
          return (
            <div key={d.id} className="glass rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-medium text-white">
                    {formatCurrency(d.amount, d.currency)}{" "}
                    <span className="text-zinc-500 font-normal">
                      via {methodLabels[d.method]}
                    </span>
                  </p>
                  <p className="text-xs font-mono text-zinc-500 mt-1">{d.reference}</p>
                </div>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </div>
              <p className="text-xs text-zinc-500">{meta.hint}</p>
              {d.transaction_id && (
                <p className="text-xs text-zinc-600 mt-2 font-mono">
                  Txn: {d.transaction_id}
                </p>
              )}
              {(d.sender_phone || d.sender_name) && (
                <p className="text-xs text-zinc-600 mt-1">
                  {d.sender_name && <span>{d.sender_name} · </span>}
                  {d.sender_phone && <span className="font-mono">{d.sender_phone}</span>}
                </p>
              )}
              <p className="text-[10px] text-zinc-600 mt-2">{formatDate(d.created_at)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
