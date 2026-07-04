"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How do I pay for activation?",
    a: "Choose a tool, sign in with Google, enter your IMEI or device ID, and pay with MTN Mobile Money, Airtel Money, or Binance Pay at checkout.",
  },
  {
    q: "What is an IMEI and where do I find it?",
    a: "IMEI is your phone's unique ID. Dial *#06# on most phones, or check Settings → About. Some tools show a device ID inside the app after you download it.",
  },
  {
    q: "How long until I get activated?",
    a: "After payment, your order shows as Processing on your dashboard. Most activations complete quickly. You'll see your code or confirmation under My Activations when ready.",
  },
  {
    q: "Can I download tools without paying?",
    a: "Yes — downloads are free. You only pay when you want to activate a specific device (IMEI).",
  },
  {
    q: "Where do I see my orders and codes?",
    a: "Go to Dashboard → Order history for invoices and status. My activations shows completed licence codes.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Common questions</h2>
          <p className="text-zinc-400 text-sm">Quick answers before you order</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={faq.q}
              className="glass rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-white text-sm">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-zinc-500 transition-transform",
                    open === i && "rotate-180"
                  )}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed border-t border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
