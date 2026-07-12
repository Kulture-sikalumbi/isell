import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Hero, HowItWorks } from "@/components/landing/hero";
import { FaqSection } from "@/components/landing/faq-section";
import { TrustSection } from "@/components/landing/trust-section";
import { FeaturedCategoryCard } from "@/components/tools/featured-category-card";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolsEmptyState } from "@/components/tools/tools-empty-state";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getFeaturedCategoriesWithTools, getTools } from "@/lib/data";
import { getUsdToZmwRate } from "@/lib/currency-rates";
import { getRequestCurrency } from "@/lib/request-currency";
import { toStorefrontTools } from "@/lib/storefront-tool";

export default async function HomePage() {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  if (profile?.role === "admin") {
    redirect("/admin");
  }

  const featuredCategories = await getFeaturedCategoriesWithTools();
  const fallbackTools = toStorefrontTools(await getTools());
  const displayCurrency = await getRequestCurrency();
  const fxRate = displayCurrency === "ZMW" ? await getUsdToZmwRate() : null;
  const showFeatured = featuredCategories.length > 0;
  const displayTools = showFeatured ? [] : fallbackTools.slice(0, 4);

  return (
    <>
      <Hero />
      <HowItWorks />
      <TrustSection />

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-3">Featured Tools</h2>
              <p className="text-zinc-400">
                Download free for Windows or Mac. Activate when you&apos;re ready.
              </p>
            </div>
            {(showFeatured || fallbackTools.length > 0) && (
              <Link
                href="/tools"
                className="hidden sm:flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {showFeatured ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredCategories.slice(0, 4).map((category) => (
                <FeaturedCategoryCard
                  key={category.id}
                  category={category}
                  isLoggedIn={Boolean(user)}
                  displayCurrency={displayCurrency}
                  fxRate={fxRate}
                />
              ))}
            </div>
          ) : displayTools.length === 0 ? (
            <ToolsEmptyState />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  isLoggedIn={Boolean(user)}
                  displayCurrency={displayCurrency}
                  fxRate={fxRate}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <FaqSection />
    </>
  );
}
