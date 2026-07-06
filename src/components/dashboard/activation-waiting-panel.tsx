"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, KeyRound, Loader2, Mail, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivationCard } from "@/components/dashboard/activation-card";
import { subscribeToActivation } from "@/lib/realtime";
import { formatActivationEtaWaiting } from "@/lib/activation-time";
import type { Activation, ActivationTimeUnit } from "@/types/database";

interface OrderStatus {
  paymentId: string;
  toolName: string;
  hardwareId: string;
  fulfillmentStatus: string | null;
  awaitingAdmin: boolean;
  fulfilled: boolean;
  activation: Activation | null;
  activationTimeValue: number | null;
  activationTimeUnit: ActivationTimeUnit | null;
}

interface ActivationWaitingPanelProps {
  paymentId: string;
  onDone?: () => void;
}

export function ActivationWaitingPanel({ paymentId, onDone }: ActivationWaitingPanelProps) {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useState("");
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/orders/${paymentId}/status`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load order status");
        if (!cancelled) {
          setStatus(data);
          setPolls((p) => p + 1);
          if (data.activation && onDone) onDone();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to check status");
        }
      }
    }

    fetchStatus();
    interval = setInterval(fetchStatus, 5000);

    const unsubRealtime = subscribeToActivation(paymentId, () => {
      if (!cancelled) fetchStatus();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubRealtime?.();
    };
  }, [paymentId, onDone]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-300 text-sm mb-4">{error}</p>
        <Link href="/dashboard?tab=orders">
          <Button variant="secondary" size="sm">
            View orders
          </Button>
        </Link>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <Loader2 className="h-10 w-10 text-cyan-400 animate-spin mx-auto mb-4" />
        <p className="text-white font-medium">Starting activation...</p>
      </div>
    );
  }

  if (status.activation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Your activation is ready!
        </div>
        <ActivationCard activation={status.activation} />
      </div>
    );
  }

  const isManualWait = status.awaitingAdmin || status.fulfillmentStatus === "awaiting";

  return (
    <div className="glass rounded-2xl p-8 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="relative mb-6">
          <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            {isManualWait ? (
              <Clock className="h-8 w-8 text-amber-400" />
            ) : (
              <KeyRound className="h-8 w-8 text-cyan-400 animate-pulse" />
            )}
          </div>
          {!isManualWait && (
            <Loader2 className="h-5 w-5 text-cyan-400 animate-spin absolute -right-1 -bottom-1" />
          )}
        </div>

        <Badge variant={isManualWait ? "warning" : "info"} className="mb-3">
          {isManualWait ? "Awaiting processing" : "Generating activation key"}
        </Badge>

        <h3 className="text-xl font-bold text-white mb-2">
          {isManualWait ? "We're preparing your activation" : "Please wait for your key"}
        </h3>

        <p className="text-sm text-zinc-400 mb-2">
          <span className="text-white font-medium">{status.toolName}</span>
        </p>
        <p className="text-xs font-mono text-zinc-500 mb-6">{status.hardwareId}</p>

        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
          {formatActivationEtaWaiting(
            status.activationTimeValue,
            status.activationTimeUnit,
            isManualWait
          )}
        </p>

        <div className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left text-sm text-zinc-400 mb-6 space-y-2">
          <p className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-zinc-200">You can leave this page.</strong> We'll email your key when
              it's ready, and it will appear in your{" "}
              <Link href="/dashboard?tab=activations" className="text-cyan-400 hover:text-cyan-300">
                Activations
              </Link>{" "}
              tab and under Orders.
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard?tab=activations">
            <Button variant="secondary" size="sm">
              Go to Activations
            </Button>
          </Link>
          <Link href="/tools">
            <Button variant="ghost" size="sm">
              Browse tools
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-600 mt-6">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Still watching for your key{polls > 0 ? " · synced" : ""}
        </div>
      </div>
    </div>
  );
}
