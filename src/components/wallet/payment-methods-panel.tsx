"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaymentMethodLogo } from "@/components/payments/payment-method-logo";
import { AirtelMoneyIcon, MtnMoMoIcon } from "@/components/payments/payment-method-icons";
import { depositMethodLabel, userPaymentMethodTypesForCurrency } from "@/lib/deposit-methods";
import { cn } from "@/lib/utils";
import type { UserPaymentMethod, UserPaymentMethodType } from "@/types/database";

const ALL_METHOD_OPTIONS: { id: UserPaymentMethodType; icon?: "mtn" | "airtel" | "binance" | "usdt" }[] = [
  { id: "mtn", icon: "mtn" },
  { id: "airtel", icon: "airtel" },
  { id: "binance", icon: "binance" },
  { id: "usdt_trc20", icon: "usdt" },
];

function MethodIcon({ method }: { method: UserPaymentMethodType }) {
  const meta = ALL_METHOD_OPTIONS.find((m) => m.id === method);
  if (!meta?.icon) return null;
  if (meta.icon === "binance" || meta.icon === "usdt") {
    return <PaymentMethodLogo method={meta.icon} size="sm" />;
  }
  if (meta.icon === "mtn") return <MtnMoMoIcon className="h-8 w-8 shrink-0 text-[9px]" />;
  return <AirtelMoneyIcon className="h-8 w-8 shrink-0 text-[7px]" />;
}

function identifierLabel(method: UserPaymentMethodType): string {
  if (method === "binance") return "Binance Pay ID";
  if (method === "usdt_trc20") return "TRC20 wallet address";
  return "Phone number";
}

function identifierPlaceholder(method: UserPaymentMethodType): string {
  if (method === "binance") return "e.g. 123456789";
  if (method === "usdt_trc20") return "TRON address (starts with T)";
  return "e.g. 0970105334";
}

function needsAccountName(method: UserPaymentMethodType): boolean {
  return method === "mtn" || method === "airtel";
}

interface PaymentMethodsPanelProps {
  initialMethods: UserPaymentMethod[];
  currency: string;
}

export function PaymentMethodsPanel({ initialMethods, currency: _currency }: PaymentMethodsPanelProps) {
  const router = useRouter();
  const methodOptions = userPaymentMethodTypesForCurrency();
  const visibleMethods = initialMethods;
  const defaultMethod = methodOptions.includes("binance") ? "binance" : "usdt_trc20";
  const [methods, setMethods] = useState(visibleMethods);
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState<UserPaymentMethodType>(defaultMethod);
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [accountName, setAccountName] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          account_identifier: accountIdentifier,
          account_name: accountName || undefined,
          label: label || undefined,
          is_default: methods.length === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setMethods((prev) => [data.method, ...prev]);
      setShowForm(false);
      setAccountIdentifier("");
      setAccountName("");
      setLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function setDefault(id: string) {
    setActionId(id);
    setError("");
    try {
      const res = await fetch(`/api/user/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      setMethods((prev) =>
        prev.map((m) => ({
          ...m,
          is_default: m.id === id,
        }))
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionId(null);
    }
  }

  async function removeMethod(id: string) {
    setActionId(id);
    setError("");
    try {
      const res = await fetch(`/api/user/payment-methods/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      setMethods((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500 leading-relaxed">
        Optional. Deposits work the same without these — you enter sender details manually each
        time. Saving a method pre-fills those fields when it matches your payment type, and is
        required before you can withdraw to mobile money or crypto.
      </p>

      {methods.length > 0 && (
        <div className="space-y-2">
          {methods.map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <MethodIcon method={m.method} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-white text-sm">{depositMethodLabel(m.method)}</p>
                  {m.is_default && (
                    <Badge variant="info" className="text-[10px]">
                      Default
                    </Badge>
                  )}
                  {m.label && <span className="text-xs text-zinc-500">· {m.label}</span>}
                </div>
                <p className="font-mono text-xs text-zinc-300 mt-0.5 break-all">
                  {m.account_identifier}
                </p>
                {m.account_name && (
                  <p className="text-xs text-zinc-500 mt-0.5">{m.account_name}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {!m.is_default && (
                  <button
                    type="button"
                    onClick={() => setDefault(m.id)}
                    disabled={actionId === m.id}
                    className="rounded-lg p-2 text-zinc-500 hover:text-amber-300 hover:bg-white/5"
                    title="Set as default"
                  >
                    {actionId === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeMethod(m.id)}
                  disabled={actionId === m.id}
                  className="rounded-lg p-2 text-zinc-500 hover:text-red-400 hover:bg-white/5"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleAdd} className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 space-y-4">
          <p className="text-sm font-medium text-white">Add payout method</p>

          <div className="grid grid-cols-2 gap-2">
            {ALL_METHOD_OPTIONS.filter((opt) => methodOptions.includes(opt.id)).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMethod(opt.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  method === opt.id
                    ? "border-cyan-400/50 bg-cyan-500/15 text-white"
                    : "border-white/10 text-zinc-400 hover:border-white/20"
                )}
              >
                <MethodIcon method={opt.id} />
                <span className="truncate">{depositMethodLabel(opt.id)}</span>
              </button>
            ))}
          </div>

          <Input
            label={identifierLabel(method)}
            placeholder={identifierPlaceholder(method)}
            value={accountIdentifier}
            onChange={(e) => setAccountIdentifier(e.target.value)}
            required
          />

          {needsAccountName(method) && (
            <Input
              label="Name on MoMo account"
              placeholder="e.g. John Banda"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              hint="Must match your mobile money account"
            />
          )}

          <Input
            label="Nickname (optional)"
            placeholder="e.g. Personal MTN"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Save method
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4" />
          Add payment method
        </Button>
      )}

      {!showForm && error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
