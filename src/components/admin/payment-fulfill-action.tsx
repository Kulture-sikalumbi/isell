"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Payment } from "@/types/database";

interface PaymentFulfillActionProps {
  payment: Payment;
}

export function PaymentFulfillAction({ payment }: PaymentFulfillActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [whitelistOnly, setWhitelistOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsAction =
    payment.status === "completed" && payment.fulfillment_status === "awaiting";

  if (!needsAction) return null;

  async function handleFulfill(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activation_code: code,
          whitelist_only: whitelistOnly,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOpen(false);
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!open ? (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <CheckCircle className="h-3.5 w-3.5" />
          Process
        </Button>
      ) : (
        <form onSubmit={handleFulfill} className="flex flex-col gap-2 min-w-[200px]">
          {payment.tool?.external_service_name && (
            <p className="text-xs text-cyan-400">
              khulnaunlockr: {payment.tool.external_service_name}
            </p>
          )}
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Activation code"
            disabled={whitelistOnly}
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-zinc-500"
          />
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={whitelistOnly}
              onChange={(e) => setWhitelistOnly(e.target.checked)}
              className="rounded"
            />
            Device registered (no code)
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Done"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
