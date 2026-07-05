"use client";

import { useState } from "react";
import { HelpCircle, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DirectApiFields,
  buildDirectApiFormState,
  buildDirectApiPayload,
} from "@/components/admin/tool-form-direct-api";
import { getCurrencyLabel } from "@/lib/currency";
import { getSuggestedPlatformFeePercent, isValidPlatformFeePercent } from "@/lib/platform-fee";
import { slugify } from "@/lib/utils";
import type { Tool, ToolFulfillmentMode } from "@/types/database";

interface ToolFormProps {
  tool?: Tool;
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
}

export function ToolForm({ tool, onSubmit }: ToolFormProps) {
  const [form, setForm] = useState({
    fulfillment_mode: (tool?.fulfillment_mode ?? "manual") as ToolFulfillmentMode,
    name: tool?.name ?? "",
    slug: tool?.slug ?? "",
    description: tool?.description ?? "",
    download_url: tool?.download_url ?? "",
    external_service_name: tool?.external_service_name ?? "",
    external_service_id: tool?.external_service_id ?? "",
    retail_price: tool?.retail_price?.toString() ?? "",
    wholesale_cost: tool?.wholesale_cost?.toString() ?? "",
    platform_fee_percent:
      tool?.platform_fee_percent != null
        ? String(tool.platform_fee_percent)
        : String(getSuggestedPlatformFeePercent()),
    identifier_label: tool?.identifier_label ?? "IMEI",
    identifier_instructions: tool?.identifier_instructions ?? "",
    identifier_placeholder: tool?.identifier_placeholder ?? "",
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
      const feePercent = parseFloat(form.platform_fee_percent);
      if (!isValidPlatformFeePercent(feePercent)) {
        throw new Error("Activation service fee must be between 0% and 100%");
      }

      const base = {
        fulfillment_mode: form.fulfillment_mode,
        name: form.name,
        slug: form.slug,
        description: form.description,
        download_url: form.download_url,
        external_service_name: form.external_service_name || null,
        external_service_id: form.external_service_id || null,
        retail_price: parseFloat(form.retail_price),
        wholesale_cost: parseFloat(form.wholesale_cost),
        platform_fee_percent: feePercent,
        identifier_label: form.identifier_label,
        identifier_instructions: form.identifier_instructions,
        identifier_placeholder: form.identifier_placeholder,
        is_active: form.is_active,
      };

      if (isManual) {
        await onSubmit?.({
          ...base,
          developer_api_url: null,
          activation_type_id: null,
          developer_name: null,
          api_config: {},
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">How activations are processed</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label
            className={`cursor-pointer rounded-xl border p-4 transition-colors ${
              isManual
                ? "border-cyan-500/40 bg-cyan-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
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
            <p className="font-medium text-white text-sm">Manual (recommended)</p>
            <p className="text-xs text-zinc-400 mt-1">
              Customer pays here. You process the IMEI on khulnaunlockr and mark the order complete.
            </p>
          </label>
          <label
            className={`cursor-pointer rounded-xl border p-4 transition-colors ${
              !isManual
                ? "border-cyan-500/40 bg-cyan-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
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
            <p className="font-medium text-white text-sm">Direct developer API</p>
            <p className="text-xs text-zinc-400 mt-1">
              Auto-submit IMEI to a developer API after payment. Advanced — use when you have API docs.
            </p>
          </label>
        </div>
      </div>

      {isManual && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-sm text-zinc-300 space-y-1">
              <p className="font-medium text-white">Simple mode</p>
              <p className="text-zinc-400">
                Add the tool name, download link, price, and IMEI instructions. When khulnaunlockr
                API is ready, tools can sync automatically — no per-tool developer connection needed.
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Tool details</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Tool name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Phantom Unlock Pro"
            required
          />
          <Input
            label="URL slug"
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="phantom-unlock"
            required
          />
          <div className="md:col-span-2">
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What this tool does…"
            />
          </div>
          <Input
            label="Download link"
            value={form.download_url}
            onChange={(e) => update("download_url", e.target.value)}
            placeholder="https://..."
            hint="Where users download the tool (free)"
          />
        </div>
      </div>

      {isManual && (
        <div>
          <h3 className="text-sm font-medium text-zinc-300 mb-1">khulnaunlockr reference</h3>
          <p className="text-xs text-zinc-500 mb-4">
            Optional — helps you match this tool to the right service when processing orders manually.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Service name on khulnaunlockr"
              value={form.external_service_name}
              onChange={(e) => update("external_service_name", e.target.value)}
              placeholder="iPhone 14 IMEI Unlock"
            />
            <Input
              label="Service ID (if known)"
              value={form.external_service_id}
              onChange={(e) => update("external_service_id", e.target.value)}
              placeholder="Optional — from khulnaunlockr"
            />
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-1">Customer IMEI / device ID</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Field label"
            value={form.identifier_label}
            onChange={(e) => update("identifier_label", e.target.value)}
            placeholder="IMEI"
            required
          />
          <Input
            label="Example placeholder"
            value={form.identifier_placeholder}
            onChange={(e) => update("identifier_placeholder", e.target.value)}
            placeholder="15-digit IMEI"
          />
          <div className="md:col-span-2">
            <Textarea
              label="How users find their IMEI"
              value={form.identifier_instructions}
              onChange={(e) => update("identifier_instructions", e.target.value)}
              placeholder={"Dial *#06# on the phone\nOr Settings → About → IMEI"}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Pricing</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label={`Retail price (${getCurrencyLabel()})`}
            type="number"
            step="0.01"
            value={form.retail_price}
            onChange={(e) => update("retail_price", e.target.value)}
            required
            hint="What your customer pays"
          />
          <Input
            label={`Wholesale cost (${getCurrencyLabel()})`}
            type="number"
            step="0.01"
            value={form.wholesale_cost}
            onChange={(e) => update("wholesale_cost", e.target.value)}
            required
            hint="What you pay on khulnaunlockr — for profit tracking"
          />
          <Input
            label="Platform cut %"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={form.platform_fee_percent}
            onChange={(e) => update("platform_fee_percent", e.target.value)}
            required
            hint="Your % on activation purchases only — hidden from customers; visible in admin dashboard"
          />
        </div>
      </div>

      {!isManual && (
        <DirectApiFields form={form.directApi} onChange={updateDirectApi} />
      )}

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => update("is_active", e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500"
        />
        <span className="text-sm text-zinc-300">Active (visible in storefront)</span>
      </label>

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
