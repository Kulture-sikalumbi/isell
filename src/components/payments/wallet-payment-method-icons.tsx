import { cn } from "@/lib/utils";
import { PaymentMethodLogo } from "@/components/payments/payment-method-logo";

interface WalletPaymentMethodIconsProps {
  className?: string;
  size?: "sm" | "md";
}

/** MTN, Airtel, Binance Pay, USDT — for deposit banners and checkout. */
export function WalletPaymentMethodIcons({
  className,
  size = "sm",
}: WalletPaymentMethodIconsProps) {
  const methods = ["mtn", "airtel", "binance", "usdt"] as const;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {methods.map((method) => (
        <PaymentMethodLogo key={method} method={method} size={size} />
      ))}
    </span>
  );
}
