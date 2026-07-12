import { PaymentMethods } from "@/components/tools/payment-methods";
import { Shield, Smartphone, Clock, Headphones } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: Smartphone,
    title: "Mobile money ready",
    description: "Pay with MTN, Airtel, Binance Pay, or USDT — no complicated checkout.",
  },
  {
    icon: Clock,
    title: "Track every order",
    description: "See pending, processing, and completed status on your dashboard.",
  },
  {
    icon: Shield,
    title: "Secure sign-in",
    description: "Google account login. Your IMEI and activations stay on your profile.",
  },
  {
    icon: Headphones,
    title: "We deliver",
    description: "Paid orders are processed promptly. Activation lands on your dashboard.",
  },
];

export function TrustSection() {
  return (
    <section className="py-20 border-y border-white/5 bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Built for self-service unlocks</h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm">
            Download tools free, pay online, track your order — no WhatsApp back-and-forth.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="glass rounded-2xl p-6 text-center sm:text-left">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 mb-4">
                <item.icon className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="max-w-md mx-auto">
          <PaymentMethods />
        </div>
      </div>
    </section>
  );
}
