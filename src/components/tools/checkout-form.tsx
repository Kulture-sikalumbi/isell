"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentMethods } from "@/components/tools/payment-methods";
import { formatCurrency } from "@/lib/utils";
import type { Tool } from "@/types/database";

interface CheckoutFormProps {
  tool: Tool;
  userEmail: string;
}

export function CheckoutForm({ tool, userEmail }: CheckoutFormProps) {
  const [hardwareId, setHardwareId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: tool.id,
          toolSlug: tool.slug,
          hardwareId,
          email: userEmail,
          amount: tool.retail_price,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Checkout failed");

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCheckout} className="space-y-5">
      <Input
        label={tool.identifier_label}
        placeholder={
          tool.identifier_placeholder ||
          `Enter your ${tool.identifier_label.toLowerCase()}`
        }
        value={hardwareId}
        onChange={(e) => setHardwareId(e.target.value)}
        required
        hint="This binds the activation to your specific device"
      />

      <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
        <p className="text-xs text-zinc-500 mb-1">Order updates on your dashboard</p>
        <p className="text-sm text-white font-medium">{userEmail}</p>
      </div>

      <div className="glass rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm text-zinc-400">Total</span>
        <span className="text-2xl font-bold text-white">
          {formatCurrency(tool.retail_price)}
        </span>
      </div>

      <PaymentMethods />

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Pay & Activate
          </>
        )}
      </Button>
    </form>
  );
}
