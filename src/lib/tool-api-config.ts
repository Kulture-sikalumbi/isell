export type ApiAuthType = "bearer" | "api_key" | "none";
export type ApiMethod = "POST" | "GET";
export type DeliveryType = "activation_code" | "whitelist";
export type ApiFailureMode = "fail_payment" | "generate_fallback";

export interface ToolApiConfig {
  method: ApiMethod;
  auth_type: ApiAuthType;
  api_key: string | null;
  auth_header_name: string;
  hardware_id_field: string;
  product_id_field: string;
  reference_field: string;
  include_email: boolean;
  email_field: string;
  response_code_path: string;
  delivery_type: DeliveryType;
  success_message: string;
  on_api_failure: ApiFailureMode;
}

export const DEFAULT_TOOL_API_CONFIG: ToolApiConfig = {
  method: "POST",
  auth_type: "bearer",
  api_key: null,
  auth_header_name: "X-API-Key",
  hardware_id_field: "hardware_id",
  product_id_field: "activation_type_id",
  reference_field: "reference",
  include_email: false,
  email_field: "email",
  response_code_path: "activation_code",
  delivery_type: "activation_code",
  success_message: "Your device has been registered and activated.",
  on_api_failure: "fail_payment",
};

export const HARDWARE_FIELD_PRESETS = [
  { value: "hardware_id", label: "hardware_id (default)" },
  { value: "imei", label: "imei" },
  { value: "serial", label: "serial" },
  { value: "device_id", label: "device_id" },
  { value: "ecid", label: "ecid" },
  { value: "custom", label: "Custom field name…" },
] as const;

export const PRODUCT_FIELD_PRESETS = [
  { value: "activation_type_id", label: "activation_type_id (default)" },
  { value: "product_id", label: "product_id" },
  { value: "service_id", label: "service_id" },
  { value: "plan_id", label: "plan_id" },
  { value: "tool_id", label: "tool_id" },
  { value: "custom", label: "Custom field name…" },
] as const;

export const RESPONSE_PATH_PRESETS = [
  { value: "activation_code", label: "activation_code (default)" },
  { value: "license_key", label: "license_key" },
  { value: "code", label: "code" },
  { value: "data.activation_code", label: "data.activation_code" },
  { value: "data.code", label: "data.code" },
  { value: "data.license_key", label: "data.license_key" },
  { value: "custom", label: "Custom path…" },
] as const;

export function parseToolApiConfig(raw: unknown): ToolApiConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_TOOL_API_CONFIG };
  }

  const config = raw as Partial<ToolApiConfig>;
  return {
    method: config.method === "GET" ? "GET" : "POST",
    auth_type:
      config.auth_type === "api_key" || config.auth_type === "none"
        ? config.auth_type
        : "bearer",
    api_key: config.api_key ?? null,
    auth_header_name: config.auth_header_name || "X-API-Key",
    hardware_id_field: config.hardware_id_field || "hardware_id",
    product_id_field: config.product_id_field || "activation_type_id",
    reference_field: config.reference_field ?? "reference",
    include_email: Boolean(config.include_email),
    email_field: config.email_field || "email",
    response_code_path: config.response_code_path || "activation_code",
    delivery_type:
      config.delivery_type === "whitelist" ? "whitelist" : "activation_code",
    success_message:
      config.success_message ||
      "Your device has been registered and activated.",
    on_api_failure:
      config.on_api_failure === "generate_fallback"
        ? "generate_fallback"
        : "fail_payment",
  };
}

export function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function buildDeveloperRequestPayload(input: {
  config: ToolApiConfig;
  activationTypeId: string;
  hardwareId: string;
  reference: string;
  email?: string;
}): Record<string, string> {
  const { config, activationTypeId, hardwareId, reference, email } = input;
  const payload: Record<string, string> = {};

  payload[config.hardware_id_field] = hardwareId;
  payload[config.product_id_field] = activationTypeId;

  if (config.reference_field) {
    payload[config.reference_field] = reference;
  }

  if (config.include_email && email) {
    payload[config.email_field] = email;
  }

  return payload;
}

export function buildDeveloperAuthHeaders(
  config: ToolApiConfig
): Record<string, string> {
  const headers: Record<string, string> = {};
  const key =
    config.api_key?.trim() || process.env.DEVELOPER_MASTER_API_KEY?.trim() || "";

  if (!key || config.auth_type === "none") {
    return headers;
  }

  if (config.auth_type === "api_key") {
    headers[config.auth_header_name || "X-API-Key"] = key;
  } else {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

export function resolvePresetValue(
  preset: string,
  custom: string,
  fallback: string
): string {
  if (preset === "custom") {
    return custom.trim() || fallback;
  }
  return preset;
}

export function resolveResponsePath(preset: string, custom: string): string {
  if (preset === "custom") {
    return custom.trim() || DEFAULT_TOOL_API_CONFIG.response_code_path;
  }
  return preset;
}
