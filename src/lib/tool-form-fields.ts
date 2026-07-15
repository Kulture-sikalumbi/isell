/** Customer checkout input defined by admin for a tool/device. */
export interface ToolFormField {
  id: string;
  label: string;
  placeholder: string;
  /** Short hint shown under the input (editable, e.g. dial *#06#). */
  hint: string;
  required: boolean;
}

/** Values captured at checkout. */
export interface CheckoutFieldValue {
  id: string;
  label: string;
  value: string;
}

export const DEFAULT_IMEI_FIELD: ToolFormField = {
  id: "primary",
  label: "IMEI",
  placeholder: "Enter 15-digit IMEI (dial *#06# on the phone)",
  hint: "Dial *#06# on the phone or check Settings → About → IMEI",
  required: true,
};

export const DEFAULT_IMEI_INSTRUCTIONS =
  "Dial *#06# on the phone\nOr Settings → About → IMEI";

function newFieldId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyFormField(
  partial?: Partial<Omit<ToolFormField, "id">>
): ToolFormField {
  return {
    id: newFieldId(),
    label: partial?.label ?? "",
    placeholder: partial?.placeholder ?? "",
    hint: partial?.hint ?? "",
    required: partial?.required ?? true,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Normalize raw JSON / form payload into valid tool form fields. */
export function normalizeFormFields(raw: unknown): ToolFormField[] {
  if (!Array.isArray(raw)) return [];

  const fields: ToolFormField[] = [];

  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;

    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label) continue;

    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : newFieldId();

    fields.push({
      id,
      label,
      placeholder: typeof row.placeholder === "string" ? row.placeholder : "",
      hint: typeof row.hint === "string" ? row.hint : "",
      required: row.required !== false,
    });
  }

  return fields;
}

/** Build form fields from legacy single-identifier columns. */
export function formFieldsFromLegacy(input: {
  identifier_label?: string | null;
  identifier_placeholder?: string | null;
  identifier_instructions?: string | null;
}): ToolFormField[] {
  const label = input.identifier_label?.trim() || DEFAULT_IMEI_FIELD.label;
  return [
    {
      id: "primary",
      label,
      placeholder:
        input.identifier_placeholder?.trim() ||
        (label.toLowerCase() === "imei"
          ? DEFAULT_IMEI_FIELD.placeholder
          : `Enter your ${label.toLowerCase()}`),
      hint:
        label.toLowerCase() === "imei" ||
        label.toLowerCase() === "ecid" ||
        label.toLowerCase() === "device id"
          ? DEFAULT_IMEI_FIELD.hint
          : "",
      required: true,
    },
  ];
}

type ToolFormSource = {
  form_fields?: unknown;
  identifier_label?: string | null;
  identifier_placeholder?: string | null;
  identifier_instructions?: string | null;
};

/** Prefer form_fields; fall back to legacy identifier_* columns. */
export function resolveToolFormFields(tool: ToolFormSource): ToolFormField[] {
  const fromJson = normalizeFormFields(tool.form_fields);
  if (fromJson.length > 0) return fromJson;
  return formFieldsFromLegacy(tool);
}

/** Keep identifier_* in sync with the first form field for older UI / emails. */
export function syncLegacyIdentifierFromFields(fields: ToolFormField[]): {
  identifier_label: string;
  identifier_placeholder: string | null;
} {
  const primary = fields[0] ?? DEFAULT_IMEI_FIELD;
  return {
    identifier_label: primary.label.trim() || "IMEI",
    identifier_placeholder: primary.placeholder.trim() || null,
  };
}

export function normalizeCheckoutFieldValues(raw: unknown): CheckoutFieldValue[] {
  if (!Array.isArray(raw)) return [];

  const values: CheckoutFieldValue[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const value = typeof row.value === "string" ? row.value.trim() : "";
    if (!label || !value) continue;
    values.push({
      id: typeof row.id === "string" ? row.id : "",
      label,
      value,
    });
  }
  return values;
}

/**
 * Validate submitted values against the tool's field definitions.
 * Returns primary value (first field) for hardware_id + all captured values.
 */
export function collectCheckoutValues(
  fields: ToolFormField[],
  submitted: Record<string, string> | undefined
):
  | { ok: true; primaryValue: string; checkoutFields: CheckoutFieldValue[] }
  | { ok: false; error: string } {
  const values = submitted ?? {};
  const checkoutFields: CheckoutFieldValue[] = [];

  for (const field of fields) {
    const value = (values[field.id] ?? "").trim();
    if (field.required && !value) {
      return { ok: false, error: `${field.label} is required` };
    }
    if (value) {
      checkoutFields.push({ id: field.id, label: field.label, value });
    }
  }

  const primaryValue = checkoutFields[0]?.value ?? "";
  if (!primaryValue) {
    return { ok: false, error: "Please fill in the required fields" };
  }

  return { ok: true, primaryValue, checkoutFields };
}

/** Prefer structured checkout_fields; else fall back to single hardware_id display. */
export function displayCheckoutFields(input: {
  checkout_fields?: unknown;
  hardware_id: string;
  identifier_label?: string | null;
}): CheckoutFieldValue[] {
  const structured = normalizeCheckoutFieldValues(input.checkout_fields);
  if (structured.length > 0) return structured;

  const label = input.identifier_label?.trim() || "ID";
  return [{ id: "primary", label, value: input.hardware_id }];
}
