"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { VariationToolRow } from "@/components/tools/variation-tool-row";
import { ToolsEmptyState } from "@/components/tools/tools-empty-state";
import { cn } from "@/lib/utils";
import type { ToolCategoryWithTools } from "@/lib/data";

interface CategoryToolsCatalogProps {
  categories: ToolCategoryWithTools[];
  isAdmin?: boolean;
}

function CategoryToolsCatalogInner({ categories, isAdmin }: CategoryToolsCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category");

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.is_active),
    [categories]
  );

  const defaultCategorySlug =
    categoryParam && visibleCategories.some((c) => c.slug === categoryParam)
      ? categoryParam
      : visibleCategories[0]?.slug ?? "";

  const [selectedSlug, setSelectedSlug] = useState(defaultCategorySlug);
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (
      categoryParam &&
      visibleCategories.some((c) => c.slug === categoryParam)
    ) {
      setSelectedSlug(categoryParam);
    }
  }, [categoryParam, visibleCategories]);

  const selectedCategory =
    visibleCategories.find((c) => c.slug === selectedSlug) ?? visibleCategories[0];

  const filteredTools = useMemo(() => {
    if (!selectedCategory) return [];
    const q = query.trim().toLowerCase();
    if (!q) return selectedCategory.tools;

    return selectedCategory.tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [selectedCategory, query]);

  function selectCategory(slug: string) {
    setSelectedSlug(slug);
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", slug);
    router.replace(`/tools?${params.toString()}`, { scroll: false });
  }

  if (visibleCategories.length === 0) {
    return <ToolsEmptyState admin={isAdmin} />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <aside className="lg:w-72 shrink-0">
        <div className="glass rounded-2xl p-4 sm:p-5 border border-white/10 lg:sticky lg:top-24">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-white">Tools</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {visibleCategories.length} tool{visibleCategories.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="lg:hidden mb-4">
            <select
              value={selectedSlug}
              onChange={(e) => selectCategory(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            >
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.slug} className="bg-zinc-900">
                  {category.name} ({category.tools.length})
                </option>
              ))}
            </select>
          </div>

          <ul className="hidden lg:block space-y-2">
            {visibleCategories.map((category) => {
              const active = category.slug === selectedSlug;
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => selectCategory(category.slug)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors",
                      active
                        ? "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20"
                        : "bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] border border-white/5"
                    )}
                  >
                    <span className="font-medium line-clamp-2">{category.name}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums",
                        active ? "bg-white/20 text-white" : "bg-white/10 text-zinc-400"
                      )}
                    >
                      {category.tools.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-6">
        {selectedCategory && (
          <>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-2">
                {selectedCategory.name}
              </h2>
              {selectedCategory.description && (
                <p className="text-sm text-zinc-400 max-w-2xl">{selectedCategory.description}</p>
              )}
            </div>

            <div className="glass rounded-2xl p-4 border border-white/10">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search devices in this tool..."
                  className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-12 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
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
              <p className="mt-2 text-xs text-zinc-500">
                {filteredTools.length} device{filteredTools.length !== 1 ? "s" : ""}
              </p>
            </div>

            {filteredTools.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-zinc-300 font-medium mb-1">
                  {selectedCategory.tools.length === 0
                    ? "No devices yet"
                    : "No matching devices"}
                </p>
                <p className="text-sm text-zinc-500">
                  {isAdmin
                    ? "Add devices under this tool from Admin → Catalog."
                    : "Check back soon or try another tool."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTools.map((tool, i) => (
                  <div
                    key={tool.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
                  >
                    <VariationToolRow tool={tool} highlight={query} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function CategoryToolsCatalog(props: CategoryToolsCatalogProps) {
  return (
    <Suspense fallback={<div className="h-48 glass rounded-2xl animate-pulse" />}>
      <CategoryToolsCatalogInner {...props} />
    </Suspense>
  );
}
