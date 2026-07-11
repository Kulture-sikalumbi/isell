import Image from "next/image";
import airtelMoney from "@/assets/airtel_money.png";
import binance from "@/assets/binance2.png";
import mtnMoney from "@/assets/mtn_money.jpg";

const PAYMENT_METHODS = [
  { name: "MTN Mobile Money", src: mtnMoney, alt: "MTN Mobile Money" },
  { name: "Airtel Money", src: airtelMoney, alt: "Airtel Money" },
  { name: "Binance Pay", src: binance, alt: "Binance Pay" },
] as const;

export function PaymentMethods() {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4">
      <p className="text-xs text-zinc-500 mb-3">Accepted payment methods</p>
      <div className="flex flex-wrap items-center gap-3">
        {PAYMENT_METHODS.map((method) => (
          <div
            key={method.name}
            className="flex h-11 min-w-[88px] items-center justify-center rounded-lg bg-white px-3 py-1.5"
            title={method.name}
          >
            <Image
              src={method.src}
              alt={method.alt}
              className="h-7 w-auto max-w-[96px] object-contain"
              sizes="96px"
            />
          </div>
        ))}
        <div
          className="flex h-11 items-center justify-center rounded-lg border border-[#26A17B]/40 bg-[#26A17B]/10 px-3 py-1.5"
          title="USDT TRC20"
        >
          <span className="text-xs font-semibold text-[#26A17B]">USDT TRC20</span>
        </div>
      </div>
    </div>
  );
}
