import { Badge } from "@/components/ui/badge";
import {
  formatActivationEtaShort,
  isInstantActivation,
  type ActivationTimeUnit,
} from "@/lib/activation-time";

interface ActivationEtaBadgeProps {
  value?: number | null;
  unit?: ActivationTimeUnit | string | null;
  className?: string;
}

export function ActivationEtaBadge({ value, unit, className }: ActivationEtaBadgeProps) {
  const instant = isInstantActivation(value, unit);
  const label = formatActivationEtaShort(value, unit);

  return (
    <Badge
      variant={instant ? "info" : "warning"}
      className={`text-xs font-semibold px-3 py-1 capitalize ${className ?? ""}`}
    >
      {label}
    </Badge>
  );
}
