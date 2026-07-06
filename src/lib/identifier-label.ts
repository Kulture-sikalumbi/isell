/** Maps technical admin labels to familiar customer-facing terms. */
const FRIENDLY_LABELS: Record<string, string> = {
  ecid: "IMEI",
  "device id": "IMEI",
};

export function getCustomerIdentifierLabel(label?: string | null): string {
  if (!label?.trim()) return "IMEI";
  const key = label.trim().toLowerCase();
  return FRIENDLY_LABELS[key] ?? label.trim();
}

export function getCustomerIdentifierPlaceholder(
  label?: string | null,
  custom?: string | null
): string {
  if (custom?.trim()) return custom.trim();
  const friendly = getCustomerIdentifierLabel(label);
  if (friendly === "IMEI") {
    return "Enter 15-digit IMEI (dial *#06# on the phone)";
  }
  return `Enter your ${friendly.toLowerCase()}`;
}
