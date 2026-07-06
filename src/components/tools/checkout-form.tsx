"use client";

import { useState } from "react";
import { ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { ActivationWaitingPanel } from "@/components/dashboard/activation-waiting-panel";
import { PaymentMethodsRow } from "@/components/payments/payment-method-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSiteCurrency } from "@/lib/currency";
import {
  getCustomerIdentifierLabel,
  getCustomerIdentifierPlaceholder,
} from "@/lib/identifier-label";
import type { StorefrontTool } from "@/lib/storefront-tool";
import { formatCurrency } from "@/lib/utils";
import { useConnectivityOptional } from "@/components/layout/connectivity-provider";
import { offlineAwareFetch, offlineMessage } from "@/lib/offline-fetch";

interface CheckoutFormProps {
  tool: StorefrontTool;
  userEmail: string;
  walletBalance: number;
  checkoutTotal: number;
  currency?: string;
}

export function CheckoutForm({
  tool,
  userEmail,
  walletBalance,
  checkoutTotal,
  currency = getSiteCurrency(),
}: CheckoutFormProps) {
  const connectivity = useConnectivityOptional();
  const [hardwareId, setHardwareId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [waitingPaymentId, setWaitingPaymentId] = useState<string | null>(null);

  const canAfford = walletBalance >= checkoutTotal;

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (connectivity && !connectivity.isOnline) {
      setError("You're offline. Reconnect to checkout — you're still signed in.");
      setLoading(false);
      return;
    }

    try {
      const res = await offlineAwareFetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: tool.id,
          toolSlug: tool.slug,
          hardwareId,
          email: userEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          throw new Error(
            `Insufficient balance. You need ${formatCurrency(data.required, currency)} but have ${formatCurrency(data.balance, currency)}.`
          );
        }
        throw new Error(data.error || "Checkout failed");
      }

      setWaitingPaymentId(data.paymentId);
    } catch (err) {
      setError(offlineMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (waitingPaymentId) {
    return <ActivationWaitingPanel paymentId={waitingPaymentId} />;
  }

  return (
    <form onSubmit={handleCheckout} className="space-y-5">
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-violet-500/5 px-4 py-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-cyan-300/80 uppercase tracking-wide font-medium">Pay with</p>
            <p className="text-sm text-white font-semibold">Prepaid wallet</p>
          </div>
          <PaymentMethodsRow />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-sm text-zinc-400">Your balance</span>
          <span className="text-lg font-bold text-white">
            {formatCurrency(walletBalance, currency)}
          </span>
        </div>
      </div>

      {!canAfford && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
          You need {formatCurrency(checkoutTotal - walletBalance, currency)} more.{" "}
          <Link href="/dashboard?tab=wallet" className="underline text-amber-200">
            Add funds via MTN / Airtel
          </Link>
        </div>
      )}

      <Input
        label={getCustomerIdentifierLabel(tool.identifier_label)}
        placeholder={getCustomerIdentifierPlaceholder(
          tool.identifier_label,
          tool.identifier_placeholder
        )}
        value={hardwareId}
        onChange={(e) => setHardwareId(e.target.value)}
        required
        hint="Dial *#06# on the phone or check Settings → About → IMEI"
      />

      <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
        <p className="text-xs text-zinc-500 mb-1">Order updates sent to</p>
        <p className="text-sm text-white font-medium">{userEmail}</p>
      </div>

      <div className="rounded-2xl border border-white/15 bg-black/40 p-5 text-sm shadow-inner">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white text-base">Total</span>
          <span className="text-xl font-bold text-gradient">
            {formatCurrency(checkoutTotal, currency)}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-zinc-500">
        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        Instant wallet payment · key emailed and saved to Activations when ready
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full h-12 text-base" loading={loading} disabled={!canAfford}>
        <Zap className="h-4 w-4" />
        Pay & activate now
      </Button>
    </form>
  );
}
