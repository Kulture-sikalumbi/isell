"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, X } from "lucide-react";
import { AdminStorefrontEditButton } from "@/components/tools/admin-storefront-edit-button";
import { ToolCategoryCard } from "@/components/tools/tool-category-card";
import { VariationToolRow } from "@/components/tools/variation-tool-row";
import { ToolsEmptyState } from "@/components/tools/tools-empty-state";
import type { ToolCategoryWithTools } from "@/lib/data";

interface CategoryToolsCatalogProps {
  categories: ToolCategoryWithTools[];
  isAdmin?: boolean;
  isLoggedIn?: boolean;
}

function CategoryToolsCatalogInner({ categories, isAdmin, isLoggedIn = false }: CategoryToolsCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const initialQuery = searchParams.get("q") ?? "";

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.is_active && c.slug !== "general"),
    [categories]
  );

  const validCategoryParam =
    categoryParam && visibleCategories.some((c) => c.slug === categoryParam)
      ? categoryParam
      : null;

  const [selectedSlug, setSelectedSlug] = useState<string | null>(validCategoryParam);
  const [browseQuery, setBrowseQuery] = useState(initialQuery);
  const [deviceQuery, setDeviceQuery] = useState("");

  useEffect(() => {
    setSelectedSlug(validCategoryParam);
  }, [validCategoryParam]);

  const selectedCategory = selectedSlug
    ? visibleCategories.find((c) => c.slug === selectedSlug) ?? null
    : null;

  const filteredBrowseCategories = useMemo(() => {
    const q = browseQuery.trim().toLowerCase();
    if (!q) return visibleCategories;
    return visibleCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [visibleCategories, browseQuery]);

  const filteredDevices = useMemo(() => {
    if (!selectedCategory) return [];
    const q = deviceQuery.trim().toLowerCase();
    if (!q) return selectedCategory.tools;
    return selectedCategory.tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [selectedCategory, deviceQuery]);

  function openCategory(slug: string) {
    setSelectedSlug(slug);
    setDeviceQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", slug);
    params.delete("q");
    router.push(`/tools?${params.toString()}`, { scroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeCategory() {
    setSelectedSlug(null);
    setDeviceQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    router.push(params.toString() ? `/tools?${params.toString()}` : "/tools", {
      scroll: true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (visibleCategories.length === 0) {
    return <ToolsEmptyState admin={isAdmin} />;
  }

  /* ── Browse: all tools as cards ── */
  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-4 border border-white/10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
            <input
              type="search"
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              placeholder="Search tools..."
              className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-12 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
            {browseQuery && (
              <button
                type="button"
                onClick={() => setBrowseQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/10"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {filteredBrowseCategories.length} tool
            {filteredBrowseCategories.length !== 1 ? "s" : ""} — tap one to see devices
          </p>
        </div>

        {filteredBrowseCategories.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-zinc-300 font-medium mb-1">No tools match your search</p>
            <button
              type="button"
              onClick={() => setBrowseQuery("")}
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            {filteredBrowseCategories.map((category, i) => (
              <div
                key={category.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
                <ToolCategoryCard
                  category={category}
                  onSelect={() => openCategory(category.slug)}
                  isAdmin={isAdmin}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Drill-in: selected tool only ── */
  return (
    <div className="space-y-6 animate-fade-up">
      <button
        type="button"
        data-global-loading
        onClick={closeCategory}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All tools
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-2">
            {selectedCategory.name}
          </h2>
          {selectedCategory.description && (
            <p className="text-sm text-zinc-400 max-w-2xl">{selectedCategory.description}</p>
          )}
        </div>
        {isAdmin && (
          <AdminStorefrontEditButton
            href={`/admin/categories/${selectedCategory.id}/edit`}
            label={`Edit ${selectedCategory.name}`}
            className="shrink-0 mt-1"
          />
        )}
      </div>

      <div className="glass rounded-2xl p-4 border border-white/10">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="search"
            value={deviceQuery}
            onChange={(e) => setDeviceQuery(e.target.value)}
            placeholder="Search devices..."
            className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-12 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          />
          {deviceQuery && (
            <button
              type="button"
              onClick={() => setDeviceQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/10"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {filteredDevices.length} device{filteredDevices.length !== 1 ? "s" : ""}
        </p>
      </div>

      {filteredDevices.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-zinc-300 font-medium mb-1">
            {selectedCategory.tools.length === 0
              ? "No devices listed yet"
              : "No matching devices"}
          </p>
          <p className="text-sm text-zinc-500">
            {isAdmin
              ? "Add devices under this tool from Admin → Catalog."
              : "Check back soon — new devices are being added."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDevices.map((tool, i) => (
            <div
              key={tool.id}
              style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
            >
              <VariationToolRow
                tool={tool}
                highlight={deviceQuery}
                isLoggedIn={isLoggedIn}
                isAdmin={isAdmin}
              />
            </div>
          ))}
        </div>
      )}
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
