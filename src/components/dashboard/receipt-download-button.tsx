"use client";

import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReceiptDownloadButtonProps {
  paymentId: string;
  receiptNumber: string;
  size?: "sm" | "md";
  variant?: "secondary" | "ghost";
}

export function ReceiptDownloadButton({
  paymentId,
  receiptNumber,
  size = "sm",
  variant = "secondary",
}: ReceiptDownloadButtonProps) {
  function openReceipt(mode: "view" | "print") {
    const url = `/dashboard/receipt/${paymentId}${mode === "print" ? "?print=1" : ""}`;
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (mode === "print" && win) {
      win.addEventListener("load", () => {
        setTimeout(() => win.print(), 400);
      });
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size={size}
        variant={variant}
        className="gap-2"
        onClick={() => openReceipt("view")}
      >
        <FileText className="h-3.5 w-3.5" />
        View receipt
      </Button>
      <Button
        type="button"
        size={size}
        variant={variant}
        className="gap-2"
        onClick={() => openReceipt("print")}
      >
        <Download className="h-3.5 w-3.5" />
        Download PDF
      </Button>
    </div>
  );
}
