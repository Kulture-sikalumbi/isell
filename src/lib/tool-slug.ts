import { slugify } from "@/lib/utils";

/** URL-safe path for a device page, prefixed with its parent tool slug. */
export function buildDeviceSlug(toolSlug: string, deviceName: string) {
  const devicePart = slugify(deviceName);
  if (!devicePart) return toolSlug || "device";
  return toolSlug ? `${toolSlug}-${devicePart}` : devicePart;
}
