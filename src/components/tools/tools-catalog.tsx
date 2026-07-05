"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolsEmptyState } from "@/components/tools/tools-empty-state";
import { cn } from "@/lib/utils";
import type { StorefrontTool } from "@/lib/storefront-tool";
import type { Tool } from "@/types/database";

type SortOption = "name" | "price-asc" | "price-desc";

interface ToolsCatalogProps {
  tools: StorefrontTool[];
  isAdmin?: boolean;
}

function ToolsCatalogInner({ tools, isAdmin }: ToolsCatalogProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortOption>("name");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = tools;

    if (q) {
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.identifier_label.toLowerCase().includes(q) ||
          t.external_service_name?.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      if (sort === "price-asc") return a.checkout_price - b.checkout_price;
      if (sort === "price-desc") return b.checkout_price - a.checkout_price;
      return a.name.localeCompare(b.name);
    });
  }, [tools, query, sort]);

  if (tools.length === 0) {
    return <ToolsEmptyState admin={isAdmin} />;
  }

  return (
    <div className="space-y-8">
      {/* Search bar */}
      <div className="sticky top-16 z-30 -mx-4 px-4 py-4 sm:static sm:mx-0 sm:px-0 sm:py-0">
        <div className="glass rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg shadow-black/20">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, device ID type, or description..."
                className="w-full rounded-xl border border-white/10 bg-black/30 py-3.5 pl-12 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
                autoFocus={Boolean(initialQuery)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/10"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors sm:hidden",
                  showFilters
                    ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300"
                    : "border-white/10 bg-white/5 text-zinc-400"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Sort
              </button>

              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
                <ArrowUpDown className="h-4 w-4 text-zinc-500 shrink-0" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="bg-transparent py-3 text-sm text-white focus:outline-none cursor-pointer"
                >
                  <option value="name" className="bg-zinc-900">Name A–Z</option>
                  <option value="price-asc" className="bg-zinc-900">Price: Low to High</option>
                  <option value="price-desc" className="bg-zinc-900">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 sm:hidden">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none"
              >
                <option value="name">Name A–Z</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {filtered.length} of {tools.length} tool{tools.length !== 1 ? "s" : ""}
              {query && (
                <span className="text-cyan-400/80">
                  {" "}matching &ldquo;{query}&rdquo;
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Search className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-300 font-medium mb-1">No tools found</p>
          <p className="text-sm text-zinc-500 mb-6">
            Try a different search term or browse all tools.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filtered.map((tool, i) => (
            <div
              key={tool.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
            >
              <ToolCard tool={tool} highlight={query} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ToolsCatalog(props: ToolsCatalogProps) {
  return (
    <Suspense fallback={<div className="h-32 glass rounded-2xl animate-pulse" />}>
      <ToolsCatalogInner {...props} />
    </Suspense>
  );
}
