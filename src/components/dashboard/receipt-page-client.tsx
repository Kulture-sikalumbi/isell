"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { OrderReceiptDocument } from "@/components/dashboard/order-receipt-document";
import { Button } from "@/components/ui/button";
import type { OrderReceiptData } from "@/lib/order-receipt";

interface ReceiptPageClientProps {
  data: OrderReceiptData;
  autoPrint?: boolean;
}

export function ReceiptPageClient({ data, autoPrint }: ReceiptPageClientProps) {
  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
          <Button type="button" size="sm" onClick={() => window.print()} className="gap-2">
            <Download className="h-4 w-4" />
            Save as PDF
          </Button>
        </div>
      </div>

      <div className="px-4 py-8 print:p-0 print:py-0">
        <OrderReceiptDocument data={data} printMode={autoPrint} />
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 12mm;
            size: A4;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-sheet {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
