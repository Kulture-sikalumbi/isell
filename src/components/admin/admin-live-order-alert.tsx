"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KeyRound, ShoppingCart, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OrderToast {
  id: string;
  title: string;
  message: string;
  paymentId: string | null;
}

export function AdminLiveOrderAlert() {
  const [toast, setToast] = useState<OrderToast | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("admin-order-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const row = payload.new as {
            id: string;
            type: string;
            title: string;
            message: string;
            payment_id: string | null;
          };

          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);

          if (row.type !== "new_order" && row.type !== "wallet_deposit") return;

          setToast({
            id: row.id,
            title: row.title,
            message: row.message,
            paymentId: row.payment_id,
          });

          clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setToast(null), 12000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(hideTimer.current);
      supabase.removeChannel(channel);
    };
  }, []);

  if (!toast) return null;

  const href =
    toast.paymentId != null ? "/admin/payments" : "/admin/deposits";

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-[100] max-w-sm">
      <div className="rounded-2xl border border-amber-500/40 bg-[#0c0d12]/95 backdrop-blur-xl shadow-2xl shadow-amber-500/10 p-4 ring-1 ring-white/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
            {toast.paymentId ? (
              <KeyRound className="h-5 w-5 text-amber-300" />
            ) : (
              <ShoppingCart className="h-5 w-5 text-amber-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{toast.title}</p>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{toast.message}</p>
            <Link
              href={href}
              className="inline-flex mt-3 text-xs font-medium text-amber-300 hover:text-amber-200"
              onClick={() => setToast(null)}
            >
              {toast.paymentId ? "Send activation key →" : "Review now →"}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-lg p-1 text-zinc-500 hover:text-white hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
