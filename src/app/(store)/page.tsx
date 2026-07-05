import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Hero, HowItWorks } from "@/components/landing/hero";
import { FaqSection } from "@/components/landing/faq-section";
import { TrustSection } from "@/components/landing/trust-section";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolsEmptyState } from "@/components/tools/tools-empty-state";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getTools } from "@/lib/data";
import { toStorefrontTools } from "@/lib/storefront-tool";

export default async function HomePage() {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  if (profile?.role === "admin") {
    redirect("/admin");
  }

  const tools = toStorefrontTools(await getTools());

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
                Download free. Activate when you&apos;re ready.
              </p>
            </div>
            {tools.length > 0 && (
              <Link
                href="/tools"
                className="hidden sm:flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {tools.length === 0 ? (
            <ToolsEmptyState />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tools.slice(0, 4).map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </div>
      </section>

      <FaqSection />
    </>
  );
}
