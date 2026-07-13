"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { formatToolPrice } from "@/lib/tool-pricing";
import type { DisplayCurrency } from "@/types/database";

interface QuickPriceEditProps {
  toolId: string;
  initialPrice: number;
  priceCurrency?: DisplayCurrency;
  onUpdated?: (price: number) => void;
}

export function QuickPriceEdit({
  toolId,
  initialPrice,
  priceCurrency = "ZMW",
  onUpdated,
}: QuickPriceEditProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialPrice.toString());
  const [saving, setSaving] = useState(false);
  const [displayPrice, setDisplayPrice] = useState(initialPrice);
  const [error, setError] = useState("");

  async function save() {
    const price = parseFloat(value);
    if (!Number.isFinite(price) || price < 0) {
      setError("Invalid price");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/tools/${toolId}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retail_price: price }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update price");

      setDisplayPrice(price);
      onUpdated?.(price);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(displayPrice.toString());
          setError("");
          setEditing(true);
        }}
        className="inline-flex items-center gap-1.5 text-white hover:text-cyan-300 transition-colors group"
        title={`Click to edit price (${priceCurrency})`}
      >
        {formatToolPrice(displayPrice, priceCurrency, priceCurrency)}
        <Pencil className="h-3 w-3 text-zinc-500 group-hover:text-cyan-400" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-zinc-500">{priceCurrency === "ZMW" ? "K" : "$"}</span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 rounded-lg border border-cyan-500/30 bg-black/40 px-2 py-1 text-sm text-white"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-lg p-1 text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50"
        aria-label="Save price"
      >
        <Check className="h-4 w-4" />
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
