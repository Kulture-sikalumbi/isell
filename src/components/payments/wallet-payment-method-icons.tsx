import { cn } from "@/lib/utils";
import { PaymentMethodLogo } from "@/components/payments/payment-method-logo";

interface WalletPaymentMethodIconsProps {
  className?: string;
  size?: "sm" | "md";
  currency?: string | null;
}

const LOGO_METHODS = ["mtn", "airtel", "binance", "usdt"] as const;

/** MTN, Airtel, Binance Pay, USDT — for deposit banners and checkout. */
export function WalletPaymentMethodIcons({
  className,
  size = "sm",
  currency: _currency,
}: WalletPaymentMethodIconsProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {LOGO_METHODS.map((method) => (
        <PaymentMethodLogo key={method} method={method} size={size} />
      ))}
    </span>
  );
}
