import Image from "next/image";
import { cn } from "@/lib/utils";
import binanceLogo from "@/assets/Binance.jpeg";
import usdtLogo from "@/assets/Trc20.jpeg";
import { AirtelMoneyIcon, MtnMoMoIcon } from "@/components/payments/payment-method-icons";

export type PaymentMethodLogoId = "mtn" | "airtel" | "binance" | "usdt";

interface PaymentMethodLogoProps {
  method: PaymentMethodLogoId;
  className?: string;
  size?: "sm" | "md";
}

const imageSizes = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
} as const;

export function PaymentMethodLogo({
  method,
  className,
  size = "md",
}: PaymentMethodLogoProps) {
  if (method === "mtn") {
    return <MtnMoMoIcon className={cn(imageSizes[size], "shrink-0 text-[10px]", className)} />;
  }
  if (method === "airtel") {
    return <AirtelMoneyIcon className={cn(imageSizes[size], "shrink-0 text-[8px]", className)} />;
  }

  const src = method === "binance" ? binanceLogo : usdtLogo;
  const alt = method === "binance" ? "Binance Pay" : "USDT TRC20";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white",
        imageSizes[size],
        className
      )}
      title={alt}
    >
      <Image src={src} alt={alt} fill className="object-contain p-1" sizes="40px" />
    </div>
  );
}
