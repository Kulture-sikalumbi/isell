"use client";

import { useState } from "react";
import { ChevronDown, Plus, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DirectApiFields,
  buildDirectApiFormState,
  buildDirectApiPayload,
} from "@/components/admin/tool-form-direct-api";
import { getCurrencyLabel } from "@/lib/currency";
import { slugify } from "@/lib/utils";
import type { Tool, ToolFulfillmentMode } from "@/types/database";

const DEFAULT_IMEI_INSTRUCTIONS =
  "Dial *#06# on the phone\nOr Settings → About → IMEI";
const DEFAULT_IMEI_PLACEHOLDER = "Enter 15-digit IMEI (dial *#06# on the phone)";

interface ToolFormProps {
  tool?: Tool;
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
}

export function ToolForm({ tool, onSubmit }: ToolFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(Boolean(tool));
  const [form, setForm] = useState({
    fulfillment_mode: (tool?.fulfillment_mode ?? "manual") as ToolFulfillmentMode,
    name: tool?.name ?? "",
    slug: tool?.slug ?? "",
    description: tool?.description ?? "",
    download_url: tool?.download_url ?? "",
    external_service_name: tool?.external_service_name ?? "",
    external_service_id: tool?.external_service_id ?? "",
    retail_price: tool?.retail_price?.toString() ?? "",
    wholesale_cost: tool?.wholesale_cost?.toString() ?? "0",
    identifier_label: tool?.identifier_label ?? "IMEI",
    identifier_instructions: tool?.identifier_instructions ?? DEFAULT_IMEI_INSTRUCTIONS,
    identifier_placeholder: tool?.identifier_placeholder ?? DEFAULT_IMEI_PLACEHOLDER,
    is_active: tool?.is_active ?? true,
    directApi: buildDirectApiFormState(tool),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isManual = form.fulfillment_mode === "manual";

  function update(field: string, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !tool && typeof value === "string") {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function updateDirectApi(field: string, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      directApi: { ...prev.directApi, [field]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const retail = parseFloat(form.retail_price);
      if (!Number.isFinite(retail) || retail < 0) {
        throw new Error("Enter a valid retail price");
      }

      const wholesale = parseFloat(form.wholesale_cost);
      const wholesaleCost = Number.isFinite(wholesale) && wholesale >= 0 ? wholesale : 0;

      const base = {
        fulfillment_mode: form.fulfillment_mode,
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim(),
        download_url: form.download_url.trim(),
        external_service_name: form.external_service_name.trim() || null,
        external_service_id: form.external_service_id.trim() || null,
        retail_price: retail,
        wholesale_cost: wholesaleCost,
        identifier_label: form.identifier_label.trim() || "IMEI",
        identifier_instructions: form.identifier_instructions.trim() || DEFAULT_IMEI_INSTRUCTIONS,
        identifier_placeholder: form.identifier_placeholder.trim() || DEFAULT_IMEI_PLACEHOLDER,
        is_active: form.is_active,
      };

      if (isManual) {
        await onSubmit?.({
          ...base,
          developer_api_url: null,
          activation_type_id: null,
          developer_name: null,
        });
      } else {
        const direct = buildDirectApiPayload(form.directApi);
        await onSubmit?.({
          ...base,
          ...direct,
          developer_name: null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Tool name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Phantom Unlock Pro"
          required
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Short description customers see on the storefront"
        />
        <Input
          label="Download link"
          value={form.download_url}
          onChange={(e) => update("download_url", e.target.value)}
          placeholder="https://..."
          hint="Free download URL shown to customers"
        />
        <Input
          label={`Activation price (${getCurrencyLabel()})`}
          type="number"
          step="0.01"
          min="0"
          value={form.retail_price}
          onChange={(e) => update("retail_price", e.target.value)}
          required
          hint="What the customer pays from their wallet"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => update("is_active", e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500"
        />
        <span className="text-sm text-zinc-300">Live on storefront</span>
      </label>

      <div className="border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left hover:border-white/20 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Settings2 className="h-4 w-4 text-zinc-500" />
            Advanced options
          </span>
          <ChevronDown
            className={`h-4 w-4 text-zinc-500 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-6 pl-1">
            <Input
              label="URL slug"
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              placeholder="phantom-unlock"
              hint="Auto-generated from name — used in /tools/your-slug"
            />

            <Input
              label={`Wholesale cost (${getCurrencyLabel()})`}
              type="number"
              step="0.01"
              min="0"
              value={form.wholesale_cost}
              onChange={(e) => update("wholesale_cost", e.target.value)}
              hint="What you pay upstream — for admin profit tracking only"
            />

            <div>
              <p className="text-sm font-medium text-zinc-300 mb-3">Order processing</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label
                  className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                    isManual
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillment_mode"
                    value="manual"
                    checked={isManual}
                    onChange={() => update("fulfillment_mode", "manual")}
                    className="sr-only"
                  />
                  <p className="font-medium text-white text-sm">Manual</p>
                  <p className="text-xs text-zinc-500 mt-1">You paste the activation key in admin</p>
                </label>
                <label
                  className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                    !isManual
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillment_mode"
                    value="direct_api"
                    checked={!isManual}
                    onChange={() => update("fulfillment_mode", "direct_api")}
                    className="sr-only"
                  />
                  <p className="font-medium text-white text-sm">Direct API</p>
                  <p className="text-xs text-zinc-500 mt-1">Auto-activate via developer API</p>
                </label>
              </div>
            </div>

            {isManual && (
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Upstream service name"
                  value={form.external_service_name}
                  onChange={(e) => update("external_service_name", e.target.value)}
                  placeholder="Optional — khulnaunlockr label"
                />
                <Input
                  label="Upstream service ID"
                  value={form.external_service_id}
                  onChange={(e) => update("external_service_id", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-zinc-300 mb-3">Checkout device ID field</p>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Field label"
                  value={form.identifier_label}
                  onChange={(e) => update("identifier_label", e.target.value)}
                  placeholder="IMEI"
                />
                <Input
                  label="Input placeholder"
                  value={form.identifier_placeholder}
                  onChange={(e) => update("identifier_placeholder", e.target.value)}
                />
                <div className="md:col-span-2">
                  <Textarea
                    label="How to find IMEI"
                    value={form.identifier_instructions}
                    onChange={(e) => update("identifier_instructions", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {!isManual && (
              <DirectApiFields form={form.directApi} onChange={updateDirectApi} />
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? "Saving…" : tool ? (
          <>
            <Save className="h-4 w-4" />
            Save changes
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Add tool
          </>
        )}
      </Button>
    </form>
  );
}
