import { cn } from "@/lib/utils";
import { depositMethodsForCurrency } from "@/lib/deposit-methods";
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
  currency,
}: WalletPaymentMethodIconsProps) {
  const methods = LOGO_METHODS.filter((method) =>
    depositMethodsForCurrency(currency).includes(
      method === "usdt" ? "usdt_trc20" : method
    )
  );

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {methods.map((method) => (
        <PaymentMethodLogo key={method} method={method} size={size} />
      ))}
    </span>
  );
}
