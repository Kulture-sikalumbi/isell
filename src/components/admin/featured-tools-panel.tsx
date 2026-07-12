"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { ToolCategory } from "@/types/database";
import type { ToolWithCategory } from "@/types/database";

interface FeaturedToolsPanelProps {
  categories: ToolCategory[];
  devicesByTool: Map<string, ToolWithCategory[]>;
}

export function FeaturedToolsPanel({ categories, devicesByTool }: FeaturedToolsPanelProps) {
  const router = useRouter();
  const featured = categories
    .filter((c) => c.is_featured && c.is_active)
    .sort((a, b) => a.featured_sort_order - b.featured_sort_order);

  async function toggleFeatured(category: ToolCategory) {
    const res = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: category.name,
        description: category.description ?? "",
        sort_order: category.sort_order,
        is_featured: !category.is_featured,
        featured_sort_order: category.featured_sort_order,
        is_active: category.is_active,
      }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <section className="glass rounded-2xl border border-violet-500/20 p-4 sm:p-6 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Star className="h-4 w-4 text-violet-400" />
            Featured on homepage
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Up to 4 featured tools show on the homepage. Edit prices in the catalog table below.
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="text-xs text-violet-300 hover:text-violet-200"
        >
          Preview homepage →
        </Link>
      </div>

      {featured.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No featured tools yet. Edit a tool and enable{" "}
          <strong className="text-zinc-400">Feature on homepage</strong>.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {featured.slice(0, 4).map((category) => {
            const devices = devicesByTool.get(category.id) ?? [];
            const minPrice = devices.reduce(
              (min, d) => Math.min(min, Number(d.retail_price)),
              Infinity
            );

            return (
              <div
                key={category.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{category.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Order {category.featured_sort_order}
                    {Number.isFinite(minPrice) && minPrice !== Infinity
                      ? ` · from ${formatCurrency(minPrice)}`
                      : " · no devices yet"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="info">Featured</Badge>
                  <Link
                    href={`/admin/categories/${category.id}/edit`}
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                    title="Edit tool"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => void toggleFeatured(category)}
                    className="text-xs text-zinc-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {categories.filter((c) => !c.is_featured && c.is_active && c.slug !== "general").length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
            Add more tools to homepage
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories
              .filter((c) => !c.is_featured && c.is_active && c.slug !== "general")
              .map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => void toggleFeatured(category)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-violet-500/30"
                >
                  + {category.name}
                </button>
              ))}
          </div>
        </details>
      )}
    </section>
  );
}
