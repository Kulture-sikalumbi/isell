import Link from "next/link";
import { ArrowRight, Download, LayoutDashboard, Smartphone, Zap } from "lucide-react";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { HeroSearch } from "@/components/landing/hero-search";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="absolute inset-0 grid-overlay pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-400 mb-8">
            <Zap className="h-3.5 w-3.5" />
            Mobile money · Self-service unlocks
          </div>

          <div className="mb-6">
            <BrandWordmark size="lg" className="justify-center" />
          </div>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mb-8 leading-relaxed">
            Download unlock tools for free. Pay with mobile money, enter your iPhone IMEI, and track
            your order until activation lands on your dashboard.
          </p>

          <HeroSearch />

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link href="/tools">
              <Button size="lg">
                Browse Tools
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" size="lg">
                <LayoutDashboard className="h-4 w-4" />
                My Dashboard
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-8 w-full max-w-lg">
            {[
              { value: "Free", label: "Downloads" },
              { value: "3+", label: "Pay methods" },
              { value: "24/7", label: "Order tracking" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-xs sm:text-sm text-zinc-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 relative">
          <div className="glow-line mb-8" />
          <div className="glass rounded-2xl p-6 max-w-2xl mx-auto animate-float">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-glow" />
              <span className="text-xs text-zinc-500 font-mono">order flow</span>
            </div>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>payment.received</span>
                <span className="text-emerald-400">✓</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>order.status</span>
                <span className="text-amber-400">processing</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">dashboard.activation</span>
                <span className="text-gradient font-bold">ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      icon: Download,
      title: "Download Free",
      description: "Grab the tool installer at no cost. It runs in limited mode until activated.",
      color: "from-cyan-500 to-cyan-600",
    },
    {
      icon: Smartphone,
      title: "Enter IMEI",
      description: "Dial *#06# on your iPhone or find IMEI in Settings → About, then checkout.",
      color: "from-violet-500 to-violet-600",
    },
    {
      icon: Zap,
      title: "Pay & track",
      description: "Pay with mobile money. Follow order status on your dashboard until activation is ready.",
      color: "from-fuchsia-500 to-fuchsia-600",
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            Three steps from download to activated device. Pay online — no need to message anyone.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={step.title} className="glass glass-hover rounded-2xl p-8 relative">
              <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#06070b] border border-white/10 text-xs font-bold text-zinc-500">
                {i + 1}
              </div>
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} mb-5 shadow-lg`}
              >
                <step.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
