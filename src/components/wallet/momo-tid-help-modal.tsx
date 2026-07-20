"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import type { DepositMethod } from "@/types/database";

type MomoTidMethod = Extract<DepositMethod, "mtn" | "airtel">;

const TID_HELP: Record<
  MomoTidMethod,
  {
    title: string;
    imageSrc: string;
    imageAlt: string;
    body: string;
    example: string;
  }
> = {
  airtel: {
    title: "Where to find your Airtel code",
    imageSrc: "/images/deposit/airtel-tid-example.png",
    imageAlt: "Airtel Money SMS showing the last 6 characters of the transaction ID highlighted",
    body: "Open your Airtel payment SMS and type the last 6 characters at the end of the ID line (shown in red in the example). You can paste the full ID if you prefer — we will still match it.",
    example: "N80400",
  },
  mtn: {
    title: "Where to find your MTN Transaction ID",
    imageSrc: "/images/deposit/mtn-tid-example.png",
    imageAlt: "MTN MoMo SMS showing the 10-digit Financial Transaction ID highlighted",
    body: "Open your MTN MoMo confirmation SMS and enter all 10 digits from Financial Transaction Id (shown in the example).",
    example: "5637282832",
  },
};

export function MomoTidHelpModal({
  open,
  method,
  onClose,
}: {
  open: boolean;
  method: MomoTidMethod;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const help = TID_HELP[method];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    return acquireBodyScrollLock();
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[260] overflow-y-auto overscroll-contain" role="presentation">
      <div className="flex min-h-[100dvh] min-h-full items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          aria-label="Close dialog"
          onClick={onClose}
        />

        <div
          className="relative z-10 w-full max-w-md max-h-[min(92dvh,calc(100dvh-2rem))] overflow-y-auto panel-solid rounded-2xl border border-cyan-500/25 p-5 sm:p-6 shadow-2xl mx-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="momo-tid-help-title"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 pr-8">
            <HelpCircle className="h-5 w-5 shrink-0 text-cyan-400 mt-0.5" />
            <div>
              <h3 id="momo-tid-help-title" className="text-base sm:text-lg font-semibold text-white">
                {help.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{help.body}</p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <Image
              src={help.imageSrc}
              alt={help.imageAlt}
              width={640}
              height={480}
              className="w-full h-auto"
              priority
            />
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            Example: <span className="font-mono text-cyan-300">{help.example}</span>
          </p>

          <Button type="button" className="w-full mt-5" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function MomoTidHelpLink({
  method,
  onOpen,
  className,
}: {
  method: MomoTidMethod;
  onOpen: () => void;
  className?: string;
}) {
  const label =
    method === "airtel"
      ? "See where to find the last 6 characters"
      : "See where to find the 10-digit ID";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={
        className ??
        "inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
      }
    >
      <HelpCircle className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}
