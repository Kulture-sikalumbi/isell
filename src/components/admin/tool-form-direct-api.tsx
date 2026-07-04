"use client";

import {
  DEFAULT_TOOL_API_CONFIG,
  HARDWARE_FIELD_PRESETS,
  PRODUCT_FIELD_PRESETS,
  RESPONSE_PATH_PRESETS,
  parseToolApiConfig,
  resolvePresetValue,
  resolveResponsePath,
  type ToolApiConfig,
} from "@/lib/tool-api-config";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/20";

function FieldSelect({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-zinc-900">
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export type DirectApiFormState = ReturnType<typeof buildDirectApiFormState>;

export function presetOrCustom(value: string, presets: readonly { value: string }[]) {
  const match = presets.find((p) => p.value === value);
  if (match && value !== "custom") {
    return { preset: value, custom: "" };
  }
  return { preset: "custom", custom: value };
}

export function buildDirectApiFormState(tool?: {
  developer_api_url?: string | null;
  activation_type_id?: string | null;
  api_config?: Record<string, unknown>;
}) {
  const config = parseToolApiConfig(tool?.api_config);
  const hardware = presetOrCustom(config.hardware_id_field, HARDWARE_FIELD_PRESETS);
  const product = presetOrCustom(config.product_id_field, PRODUCT_FIELD_PRESETS);
  const response = presetOrCustom(config.response_code_path, RESPONSE_PATH_PRESETS);

  return {
    developer_api_url: tool?.developer_api_url ?? "",
    activation_type_id: tool?.activation_type_id ?? "",
    method: config.method,
    auth_type: config.auth_type,
    api_key: config.api_key ?? "",
    auth_header_name: config.auth_header_name,
    hardware_field_preset: hardware.preset,
    hardware_field_custom: hardware.custom,
    product_field_preset: product.preset,
    product_field_custom: product.custom,
    reference_field: config.reference_field,
    include_email: config.include_email,
    response_path_preset: response.preset,
    response_path_custom: response.custom,
    delivery_type: config.delivery_type,
    success_message: config.success_message,
    on_api_failure: config.on_api_failure,
  };
}

export function buildDirectApiPayload(form: DirectApiFormState): {
  developer_api_url: string;
  activation_type_id: string;
  api_config: ToolApiConfig;
} {
  return {
    developer_api_url: form.developer_api_url,
    activation_type_id: form.activation_type_id,
    api_config: {
      method: form.method,
      auth_type: form.auth_type,
      api_key: form.api_key.trim() || null,
      auth_header_name: form.auth_header_name || "X-API-Key",
      hardware_id_field: resolvePresetValue(
        form.hardware_field_preset,
        form.hardware_field_custom,
        DEFAULT_TOOL_API_CONFIG.hardware_id_field
      ),
      product_id_field: resolvePresetValue(
        form.product_field_preset,
        form.product_field_custom,
        DEFAULT_TOOL_API_CONFIG.product_id_field
      ),
      reference_field: form.reference_field,
      include_email: form.include_email,
      email_field: "email",
      response_code_path: resolveResponsePath(
        form.response_path_preset,
        form.response_path_custom
      ),
      delivery_type: form.delivery_type,
      success_message: form.success_message,
      on_api_failure: form.on_api_failure,
    },
  };
}

interface DirectApiFieldsProps {
  form: DirectApiFormState;
  onChange: (field: string, value: string | boolean) => void;
}

export function DirectApiFields({ form, onChange }: DirectApiFieldsProps) {
  return (
    <>
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-1">Direct developer API</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Only needed if this tool connects straight to a developer — not via khulnaunlockr.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="API endpoint URL"
              value={form.developer_api_url}
              onChange={(e) => onChange("developer_api_url", e.target.value)}
              placeholder="https://api.developer.com/v1/activate"
              required
            />
          </div>
          <Input
            label="Product / plan ID"
            value={form.activation_type_id}
            onChange={(e) => onChange("activation_type_id", e.target.value)}
            placeholder="phantom_pro_v3"
            required
          />
          <Input
            label="API key (optional)"
            type="password"
            value={form.api_key}
            onChange={(e) => onChange("api_key", e.target.value)}
            placeholder="Leave blank to use global server key"
          />
          <FieldSelect
            label="Request method"
            value={form.method}
            onChange={(v) => onChange("method", v)}
            options={[
              { value: "POST", label: "POST" },
              { value: "GET", label: "GET" },
            ]}
          />
          <FieldSelect
            label="Authentication"
            value={form.auth_type}
            onChange={(v) => onChange("auth_type", v)}
            options={[
              { value: "bearer", label: "Bearer token" },
              { value: "api_key", label: "API key header" },
              { value: "none", label: "None" },
            ]}
          />
          <FieldSelect
            label="Device ID field name"
            value={form.hardware_field_preset}
            onChange={(v) => onChange("hardware_field_preset", v)}
            options={[...HARDWARE_FIELD_PRESETS]}
          />
          {form.hardware_field_preset === "custom" && (
            <Input
              label="Custom device field"
              value={form.hardware_field_custom}
              onChange={(e) => onChange("hardware_field_custom", e.target.value)}
            />
          )}
          <FieldSelect
            label="Product ID field name"
            value={form.product_field_preset}
            onChange={(v) => onChange("product_field_preset", v)}
            options={[...PRODUCT_FIELD_PRESETS]}
          />
          {form.product_field_preset === "custom" && (
            <Input
              label="Custom product field"
              value={form.product_field_custom}
              onChange={(e) => onChange("product_field_custom", e.target.value)}
            />
          )}
          <FieldSelect
            label="Code location in response"
            value={form.response_path_preset}
            onChange={(v) => onChange("response_path_preset", v)}
            options={[...RESPONSE_PATH_PRESETS]}
          />
          {form.response_path_preset === "custom" && (
            <Input
              label="Custom response path"
              value={form.response_path_custom}
              onChange={(e) => onChange("response_path_custom", e.target.value)}
            />
          )}
        </div>
      </div>
    </>
  );
}
