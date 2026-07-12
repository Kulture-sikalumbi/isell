"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CurrencyRateFormProps {
  initialRate: number | null;
}

export function CurrencyRateForm({ initialRate }: CurrencyRateFormProps) {
  const router = useRouter();
  const [rate, setRate] = useState(initialRate?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveRate() {
    const value = Number(rate);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid USD to ZMW rate");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/settings/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdToZmwRate: value }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save rate");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rate");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">1 USD = ? ZMW</span>
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          step="0.0001"
          min="0"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-500/40"
          placeholder="Enter live rate"
        />
      </label>
      <button
        type="button"
        onClick={() => void saveRate()}
        disabled={saving}
        className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save rate"}
      </button>
      {error && <p className="sm:col-span-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}