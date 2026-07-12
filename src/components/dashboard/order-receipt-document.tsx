import { formatSiteCurrency } from "@/lib/format-currency";
import type { OrderReceiptData } from "@/lib/order-receipt";

interface OrderReceiptDocumentProps {
  data: OrderReceiptData;
  /** When true, omit outer padding (print layout). */
  printMode?: boolean;
}

export function OrderReceiptDocument({ data, printMode }: OrderReceiptDocumentProps) {
  const fmt = (n: number) => formatSiteCurrency(n, data.currency);

  return (
    <article
      className={
        printMode
          ? "receipt-sheet mx-auto bg-white text-zinc-900"
          : "receipt-sheet mx-auto max-w-lg bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200"
      }
    >
      <header className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-cyan-600 via-violet-600 to-violet-800 text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_55%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              iSell Unlocks
            </p>
            <h1 className="text-2xl font-bold mt-1 tracking-tight">Payment Receipt</h1>
            <p className="text-sm text-white/75 mt-1">Official order confirmation</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-white/60">Receipt #</p>
            <p className="font-mono text-sm font-semibold">{data.receiptNumber}</p>
          </div>
        </div>
      </header>

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
              Billed to
            </p>
            <p className="font-semibold text-zinc-900">{data.customerName}</p>
            <p className="text-zinc-600 text-xs mt-0.5 break-all">{data.customerEmail}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
              Date
            </p>
            <p className="font-medium text-zinc-900">{data.issuedAt}</p>
            {data.paidAt && (
              <p className="text-xs text-zinc-500 mt-0.5">Paid {data.paidAt}</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Description
                </th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-100">
                <td className="px-4 py-4">
                  <p className="font-semibold text-zinc-900">{data.toolName}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {data.identifierLabel}:{" "}
                    <span className="font-mono text-zinc-700">{data.hardwareId}</span>
                  </p>
                </td>
                <td className="px-4 py-4 text-right font-medium text-zinc-900 whitespace-nowrap">
                  {fmt(data.subtotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span>{fmt(data.subtotal)}</span>
            </div>
            {data.platformFee > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Included fees</span>
                <span>{fmt(data.platformFee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-zinc-200 text-base font-bold text-zinc-900">
              <span>Total paid</span>
              <span className="text-violet-700">{fmt(data.total)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5">
            <p className="text-zinc-400 uppercase tracking-wide text-[10px] font-semibold">
              Payment
            </p>
            <p className="text-zinc-800 font-medium mt-0.5">{data.paymentMethod}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5">
            <p className="text-zinc-400 uppercase tracking-wide text-[10px] font-semibold">
              Status
            </p>
            <p className="text-zinc-800 font-medium mt-0.5">{data.statusLabel}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5 col-span-2">
            <p className="text-zinc-400 uppercase tracking-wide text-[10px] font-semibold">
              Fulfillment
            </p>
            <p className="text-zinc-800 font-medium mt-0.5">{data.fulfillmentLabel}</p>
          </div>
        </div>

        {data.activationCode && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-1">
              Activation key
            </p>
            <p className="font-mono text-sm font-bold text-emerald-900 break-all">
              {data.activationCode}
            </p>
          </div>
        )}
      </div>

      <footer className="px-8 py-5 bg-zinc-50 border-t border-zinc-200 text-center">
        <p className="text-xs text-zinc-500 leading-relaxed">
          Thank you for choosing iSell Unlocks.
          <br />
          Keep this receipt for your records · Support via your account dashboard.
        </p>
        <p className="text-[10px] text-zinc-400 mt-2 font-mono">ID {data.paymentId}</p>
      </footer>
    </article>
  );
}
