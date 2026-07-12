export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export { formatSiteCurrency as formatCurrency } from "@/lib/format-currency";

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function maskCode(code: string) {
  if (code.length <= 8) return code;
  return `${code.slice(0, 4)}${"•".repeat(code.length - 8)}${code.slice(-4)}`;
}
