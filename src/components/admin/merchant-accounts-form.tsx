"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { MerchantDepositSettings } from "@/lib/site-settings";

interface MerchantAccountsFormProps {
  initial: MerchantDepositSettings;
}

export function MerchantAccountsForm({ initial }: MerchantAccountsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    mtn: initial.mtn,
    airtel: initial.airtel,
    binancePayId: initial.binancePayId,
    usdtTrc20Address: initial.usdtTrc20Address,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function saveAccounts() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch("/api/admin/settings/merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save");

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Input
        label="MTN Mobile Money number"
        value={form.mtn}
        onChange={(e) => update("mtn", e.target.value)}
        placeholder="260970105334"
        hint="Shown to Zambia (K) customers depositing via MTN MoMo"
      />
      <Input
        label="Airtel Money number"
        value={form.airtel}
        onChange={(e) => update("airtel", e.target.value)}
        placeholder="260970105334"
        hint="Shown to Zambia (K) customers depositing via Airtel"
      />
      <Input
        label="Binance Pay user ID"
        value={form.binancePayId}
        onChange={(e) => update("binancePayId", e.target.value)}
        placeholder="826667762"
        hint="Binance Pay ID customers send to (Zambia + international)"
      />
      <Input
        label="USDT TRC20 wallet address"
        value={form.usdtTrc20Address}
        onChange={(e) => update("usdtTrc20Address", e.target.value)}
        placeholder="T..."
        hint="TRC20 address for crypto deposits"
      />

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300">
          Deposit accounts saved. Customers will see these on their wallet page.
        </div>
      )}

      <button
        type="button"
        onClick={() => void saveAccounts()}
        disabled={saving}
        className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-3 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save deposit accounts"}
      </button>
    </div>
  );
}
