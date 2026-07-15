import { getCustomerIdentifierLabel } from "@/lib/identifier-label";
import { displayCheckoutFields } from "@/lib/tool-form-fields";

interface CheckoutFieldsDisplayProps {
  hardwareId: string;
  checkoutFields?: unknown;
  identifierLabel?: string | null;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

/** Renders one or more submitted checkout fields for admin/customer order views. */
export function CheckoutFieldsDisplay({
  hardwareId,
  checkoutFields,
  identifierLabel,
  className = "space-y-2",
  labelClassName = "text-xs text-zinc-500 mb-1",
  valueClassName = "font-mono text-zinc-200 break-all",
}: CheckoutFieldsDisplayProps) {
  const fields = displayCheckoutFields({
    checkout_fields: checkoutFields,
    hardware_id: hardwareId,
    identifier_label: identifierLabel,
  });

  return (
    <div className={className}>
      {fields.map((field) => (
        <div key={`${field.id}-${field.label}`}>
          <p className={labelClassName}>
            {getCustomerIdentifierLabel(field.label)}
          </p>
          <p className={valueClassName}>{field.value}</p>
        </div>
      ))}
    </div>
  );
}
