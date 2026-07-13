"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DirectApiFields,
  buildDirectApiFormState,
  buildDirectApiPayload,
} from "@/components/admin/tool-form-direct-api";
import { normalizePriceCurrency } from "@/lib/tool-pricing";
import type { DisplayCurrency } from "@/types/database";
import {
  ACTIVATION_TIME_UNIT_OPTIONS,
  parseActivationTimeFields,
} from "@/lib/activation-time";
import type { Tool, ToolCategory, ToolFulfillmentMode } from "@/types/database";

const DEFAULT_IMEI_INSTRUCTIONS =
  "Dial *#06# on the phone\nOr Settings → About → IMEI";
const DEFAULT_IMEI_PLACEHOLDER = "Enter 15-digit IMEI (dial *#06# on the phone)";

interface ToolFormProps {
  tool?: Tool;
  categories: ToolCategory[];
  defaultCategoryId?: string;
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  onSaveAndNext?: (data: Record<string, unknown>) => void | Promise<void>;
}

export function ToolForm({
  tool,
  categories,
  defaultCategoryId,
  onSubmit,
  onSaveAndNext,
}: ToolFormProps) {
  const initialCategoryId =
    tool?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? "";

  const [showAdvanced, setShowAdvanced] = useState(Boolean(tool));
  const [form, setForm] = useState({
    category_id: initialCategoryId,
    fulfillment_mode: (tool?.fulfillment_mode ?? "manual") as ToolFulfillmentMode,
    name: tool?.name ?? "",
    description: tool?.description ?? "",
    download_url: tool?.download_url ?? "",
    download_url_mac: tool?.download_url_mac ?? "",
    external_service_name: tool?.external_service_name ?? "",
    external_service_id: tool?.external_service_id ?? "",
    retail_price: tool?.retail_price?.toString() ?? "",
    price_currency: normalizePriceCurrency(tool?.price_currency) as DisplayCurrency,
    wholesale_cost: tool?.wholesale_cost?.toString() ?? "0",
    sort_order: tool?.sort_order?.toString() ?? "0",
    activation_time_value: tool?.activation_time_value?.toString() ?? "",
    activation_time_unit: tool?.activation_time_unit ?? "hours",
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
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateDirectApi(field: string, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      directApi: { ...prev.directApi, [field]: value },
    }));
  }

  async function submitPayload(
    submitFn: ((data: Record<string, unknown>) => void | Promise<void>) | undefined
  ) {
    setSubmitting(true);
    setError("");

    try {
      const retail = parseFloat(form.retail_price);
      if (!Number.isFinite(retail) || retail < 0) {
        throw new Error("Enter a valid retail price");
      }

      const wholesale = parseFloat(form.wholesale_cost);
      const wholesaleCost = Number.isFinite(wholesale) && wholesale >= 0 ? wholesale : 0;

      if (!form.category_id) {
        throw new Error("Select the tool this device belongs to");
      }

      const sortOrder = parseInt(form.sort_order, 10);
      const activationTime = parseActivationTimeFields(
        form.activation_time_value,
        form.activation_time_unit
      );

      const base = {
        category_id: form.category_id,
        fulfillment_mode: form.fulfillment_mode,
        name: form.name.trim(),
        description: form.description.trim(),
        download_url: form.download_url.trim() || null,
        download_url_mac: form.download_url_mac.trim() || null,
        external_service_name: form.external_service_name.trim() || null,
        external_service_id: form.external_service_id.trim() || null,
        retail_price: retail,
        price_currency: form.price_currency,
        wholesale_cost: wholesaleCost,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        ...activationTime,
        identifier_label: form.identifier_label.trim() || "IMEI",
        identifier_instructions: form.identifier_instructions.trim() || DEFAULT_IMEI_INSTRUCTIONS,
        identifier_placeholder: form.identifier_placeholder.trim() || DEFAULT_IMEI_PLACEHOLDER,
        is_active: form.is_active,
      };

      if (isManual) {
        await submitFn?.({
          ...base,
          developer_api_url: null,
          activation_type_id: null,
          developer_name: null,
        });
      } else {
        const direct = buildDirectApiPayload(form.directApi);
        await submitFn?.({
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitPayload(onSubmit);
  }

  async function handleSaveAndNext(e: React.FormEvent) {
    e.preventDefault();
    await submitPayload(onSaveAndNext);
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
        Add a tool first, then add device variations under it.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Tool</label>
          <select
            value={form.category_id}
            onChange={(e) => update("category_id", e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          >
            <option value="" className="bg-zinc-900">
              Select tool…
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id} className="bg-zinc-900">
                {category.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 mt-1.5">
            The tool name customers pick in the sidebar
          </p>
        </div>
        <Input
          label="Device name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="iPhone 13 · No Signal"
          required
          hint="Specific model or variant — e.g. iPad Air 4gen, iPhone X"
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Short description customers see on the storefront"
        />
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <p className="text-sm font-medium text-zinc-300">Desktop downloads</p>
          <p className="text-xs text-zinc-500 -mt-2">
            Free download links for Windows and Mac — customers see these on this device page.
          </p>
          <Input
            label="Windows download link"
            value={form.download_url}
            onChange={(e) => update("download_url", e.target.value)}
            placeholder="https://..."
            hint="Win tool installer or zip"
          />
          <Input
            label="Mac download link"
            value={form.download_url_mac}
            onChange={(e) => update("download_url_mac", e.target.value)}
            placeholder="https://..."
            hint="Mac tool installer or dmg"
          />
        </div>
        <Input
          label="Sort order"
          type="number"
          value={form.sort_order}
          onChange={(e) => update("sort_order", e.target.value)}
          hint="Order within the tool list (lower first)"
        />
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Price currency</label>
          <div className="grid grid-cols-2 gap-3">
            {(["ZMW", "USD"] as const).map((code) => (
              <label
                key={code}
                className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                  form.price_currency === code
                    ? "border-cyan-500/40 bg-cyan-500/10"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <input
                  type="radio"
                  name="price_currency"
                  value={code}
                  checked={form.price_currency === code}
                  onChange={() => update("price_currency", code)}
                  className="sr-only"
                />
                <p className="font-medium text-white text-sm">
                  {code === "ZMW" ? "Zambia (K)" : "US Dollar ($)"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Stored as entered — customers see converted prices
                </p>
              </label>
            ))}
          </div>
        </div>
        <Input
          label={`Activation price (${form.price_currency === "ZMW" ? "K" : "USD"})`}
          type="number"
          step="0.01"
          min="0"
          value={form.retail_price}
          onChange={(e) => update("retail_price", e.target.value)}
          required
          hint="What the customer pays from their wallet"
        />
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Activation time
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min="1"
              value={form.activation_time_value}
              onChange={(e) => update("activation_time_value", e.target.value)}
              placeholder="e.g. 5"
              hint="Leave empty for instant"
            />
            <div>
              <select
                value={form.activation_time_unit}
                onChange={(e) => update("activation_time_unit", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 mt-0"
              >
                {ACTIVATION_TIME_UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-900">
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1.5">Shown to customers at checkout</p>
            </div>
          </div>
        </div>
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
              label={`Wholesale cost (${form.price_currency === "ZMW" ? "K" : "USD"})`}
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

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Saving…" : tool ? (
            <>
              <Save className="h-4 w-4" />
              Save changes
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add device
            </>
          )}
        </Button>
        {tool && onSaveAndNext && (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={submitting}
            onClick={handleSaveAndNext}
          >
            {submitting ? "Saving…" : (
              <>
                Save &amp; next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
