import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ListOrdered, Shield, Clock } from "lucide-react";
import { ActivationEtaBadge } from "@/components/tools/activation-eta-badge";
import { formatActivationEtaLong } from "@/lib/activation-time";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutForm } from "@/components/tools/checkout-form";
import { SignInGate } from "@/components/tools/sign-in-gate";
import { Badge } from "@/components/ui/badge";
import { toStorefrontTool } from "@/lib/storefront-tool";
import { getToolBySlug } from "@/lib/data";
import { getWalletBalance } from "@/lib/wallet";
import { getSiteCurrency } from "@/lib/currency";
import { getCustomerIdentifierLabel } from "@/lib/identifier-label";
import { ToolPrice } from "@/components/tools/tool-price";

interface ToolDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ToolDetailPageProps) {
  const { slug } = await params;
  const tool = await getToolBySlug(slug);
  return { title: tool ? `${tool.name} — iSell Unlocks` : "Tool Not Found" };
}

export default async function ToolDetailPage({ params }: ToolDetailPageProps) {
  const { slug } = await params;
  const tool = await getToolBySlug(slug);
  const user = await getCurrentUser();

  if (!tool) notFound();

  const userEmail = user?.email ?? "";
  const walletBalance = user ? await getWalletBalance(user.id) : 0;
  const storefrontTool = toStorefrontTool(tool);
  const currency = getSiteCurrency();
  const identifierLabel = getCustomerIdentifierLabel(tool.identifier_label);
  const downloadUrl = tool.download_url || null;
  const backHref = tool.category?.slug
    ? `/tools?category=${tool.category.slug}`
    : "/tools";

  return (
    <section className="pt-28 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {tool.category ? `Back to ${tool.category.name}` : "Back to tools"}
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {tool.category && (
                <Badge variant="default">{tool.category.name}</Badge>
              )}
              <ActivationEtaBadge
                value={tool.activation_time_value}
                unit={tool.activation_time_unit}
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">{tool.name}</h1>
            <p className="text-zinc-400 leading-relaxed mb-8">{tool.description}</p>

            <div className="glass rounded-2xl p-6 space-y-4 mb-8">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-400">Activation Price</span>
                <ToolPrice
                  amount={storefrontTool.checkout_price}
                  currency={currency}
                  isLoggedIn={Boolean(user)}
                  loginNext={`/tools/${tool.slug}`}
                  variant="large"
                />
              </div>
              <div className="glow-line" />
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                {formatActivationEtaLong(tool.activation_time_value, tool.activation_time_unit)}
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Shield className="h-4 w-4 text-cyan-400" />
                Hardware-bound to your {identifierLabel}
              </div>
            </div>

            {downloadUrl && (
              <div className="mb-4">
                {user ? (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Tool (Free)
                  </a>
                ) : (
                  <SignInGate tool={tool} mode="download" />
                )}
              </div>
            )}

            {tool.identifier_instructions && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-6 mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <ListOrdered className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-medium text-white">
                    How to find your {identifierLabel}
                  </h3>
                </div>
                <div className="text-sm text-zinc-400 whitespace-pre-line leading-relaxed">
                  {tool.identifier_instructions}
                </div>
              </div>
            )}
          </div>

          <div className="panel-solid rounded-2xl p-6 sm:p-8 border border-cyan-500/20 shadow-xl shadow-cyan-500/5 ring-1 ring-white/5 sticky top-24">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white">Activate now</h2>
              <span className="text-xs text-zinc-500 uppercase tracking-wide">{currency}</span>
            </div>
            <p className="text-sm text-zinc-500 mb-6">Pay from your prepaid wallet — funded via MTN, Airtel, Binance Pay, or USDT</p>
            {user && userEmail ? (
              <CheckoutForm
                tool={storefrontTool}
                userEmail={userEmail}
                walletBalance={walletBalance}
                checkoutTotal={storefrontTool.checkout_price}
                currency={currency}
              />
            ) : (
              <SignInGate tool={tool} mode="activate" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
