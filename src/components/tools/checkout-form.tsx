"use client";

import { useState } from "react";
import { Loader2, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { Tool } from "@/types/database";

interface CheckoutFormProps {
  tool: Tool;
  userEmail: string;
  walletBalance: number;
  platformFee: number;
}

export function CheckoutForm({
  tool,
  userEmail,
  walletBalance,
  platformFee,
}: CheckoutFormProps) {
  const [hardwareId, setHardwareId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toolPrice = Number(tool.retail_price);
  const totalCost = toolPrice + platformFee;
  const canAfford = walletBalance >= totalCost;

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          throw new Error(
            `Insufficient balance. You need ${formatCurrency(data.required)} but have ${formatCurrency(data.balance)}.`
          );
        }
        throw new Error(data.error || "Checkout failed");
      }

      window.location.href = data.redirectUrl || "/dashboard?tab=orders";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCheckout} className="space-y-5">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-cyan-400" />
          <span className="text-sm text-zinc-300">Wallet balance</span>
        </div>
        <span className="font-semibold text-white">{formatCurrency(walletBalance)}</span>
      </div>

      {!canAfford && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
          You need {formatCurrency(totalCost - walletBalance)} more.{" "}
          <Link href="/dashboard?tab=wallet" className="underline text-amber-200">
            Add funds
          </Link>
        </div>
      )}

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

      <div className="glass rounded-xl p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between text-zinc-400">
          <span>Activation</span>
          <span>{formatCurrency(toolPrice)}</span>
        </div>
        <div className="flex items-center justify-between text-zinc-400">
          <span>Service fee</span>
          <span>{formatCurrency(platformFee)}</span>
        </div>
        <div className="glow-line" />
        <div className="flex items-center justify-between font-semibold text-white">
          <span>Total from wallet</span>
          <span>{formatCurrency(totalCost)}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading || !canAfford}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Pay from wallet & activate
          </>
        )}
      </Button>
    </form>
  );
}
