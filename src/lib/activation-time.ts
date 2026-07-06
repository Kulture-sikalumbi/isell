export type ActivationTimeUnit = "minutes" | "hours" | "days";

const UNIT_LABELS: Record<ActivationTimeUnit, { one: string; many: string }> = {
  minutes: { one: "minute", many: "minutes" },
  hours: { one: "hour", many: "hours" },
  days: { one: "day", many: "days" },
};

export function isInstantActivation(
  value: number | null | undefined,
  unit: ActivationTimeUnit | string | null | undefined
): boolean {
  if (!unit || value == null || value <= 0) return true;
  return false;
}

/** Short label for badges — e.g. "5 days", "Instant" */
export function formatActivationEtaShort(
  value: number | null | undefined,
  unit: ActivationTimeUnit | string | null | undefined
): string {
  if (isInstantActivation(value, unit)) return "Instant";

  const u = unit as ActivationTimeUnit;
  const labels = UNIT_LABELS[u];
  if (!labels) return "Instant";

  const word = value === 1 ? labels.one : labels.many;
  return `${value} ${word}`;
}

/** Customer-facing sentence — e.g. "Activation takes up to 5 days" */
export function formatActivationEtaLong(
  value: number | null | undefined,
  unit: ActivationTimeUnit | string | null | undefined
): string {
  if (isInstantActivation(value, unit)) {
    return "Activation is usually instant after payment.";
  }

  const short = formatActivationEtaShort(value, unit);
  return `Activation takes up to ${short}.`;
}

export function parseActivationTimeFields(
  valueRaw: string,
  unitRaw: string
): { activation_time_value: number | null; activation_time_unit: ActivationTimeUnit | null } {
  const value = parseInt(valueRaw.trim(), 10);
  const unit = unitRaw as ActivationTimeUnit;

  if (!valueRaw.trim() || !Number.isFinite(value) || value <= 0) {
    return { activation_time_value: null, activation_time_unit: null };
  }

  if (unit !== "minutes" && unit !== "hours" && unit !== "days") {
    throw new Error("Select minutes, hours, or days for activation time");
  }

  return { activation_time_value: value, activation_time_unit: unit };
}

/** Note shown while customer waits after payment */
export function formatActivationEtaWaiting(
  value: number | null | undefined,
  unit: ActivationTimeUnit | string | null | undefined,
  manual: boolean
): string {
  const eta = formatActivationEtaLong(value, unit);

  if (manual) {
    return `Payment received. An admin is preparing your activation key. ${eta}`;
  }

  if (isInstantActivation(value, unit)) {
    return "We're contacting the activation server. This usually takes a few seconds.";
  }

  return `We're contacting the activation server. ${eta}`;
}

export const ACTIVATION_TIME_UNIT_OPTIONS: { value: ActivationTimeUnit; label: string }[] = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
];
