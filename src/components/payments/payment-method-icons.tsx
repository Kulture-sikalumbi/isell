import { cn } from "@/lib/utils";
import { PaymentMethodLogo } from "@/components/payments/payment-method-logo";

interface IconProps {
  className?: string;
}

export function MtnMoMoIcon({ className }: IconProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFCC00] text-[10px] font-black text-black shadow-sm",
        className
      )}
      title="MTN Mobile Money"
    >
      MTN
    </div>
  );
}

export function AirtelMoneyIcon({ className }: IconProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg bg-[#ED1C24] text-[9px] font-bold text-white shadow-sm",
        className
      )}
      title="Airtel Money"
    >
      airtel
    </div>
  );
}

export function BinancePayIcon({ className }: IconProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0B90B] text-[9px] font-black text-[#1E2329] shadow-sm",
        className
      )}
      title="Binance Pay"
    >
      BNB
    </div>
  );
}

export function UsdtTrc20Icon({ className }: IconProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg bg-[#26A17B] text-[8px] font-bold text-white shadow-sm",
        className
      )}
      title="USDT TRC20"
    >
      USDT
    </div>
  );
}

export function WalletPayIcon({ className }: IconProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-sm",
        className
      )}
      title="Prepaid wallet"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
        <path d="M16 12h4" />
        <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

interface PaymentMethodsRowProps {
  showWallet?: boolean;
  showMomo?: boolean;
  currency?: string | null;
  className?: string;
}

const LOGO_METHODS = ["mtn", "airtel", "binance", "usdt"] as const;

export function PaymentMethodsRow({
  showWallet = true,
  showMomo = true,
  currency: _currency,
  className,
}: PaymentMethodsRowProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showWallet && <WalletPayIcon />}
      {showMomo &&
        LOGO_METHODS.map((method) => (
          <PaymentMethodLogo key={method} method={method} size="sm" />
        ))}
    </div>
  );
}
