"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { CategoryForm } from "@/components/admin/category-form";
import type { ToolCategory } from "@/types/database";

interface NeighborCategory {
  id: string;
  name: string;
}

interface EditCategoryPageProps {
  category: ToolCategory;
  prevCategory: NeighborCategory | null;
  nextCategory: NeighborCategory | null;
}

export function EditCategoryPage({
  category,
  prevCategory,
  nextCategory,
}: EditCategoryPageProps) {
  const router = useRouter();

  async function saveCategory(data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to save category");
    }
  }

  async function handleSubmit(data: Record<string, unknown>) {
    await saveCategory(data);
    router.push(`/admin/categories#tool-${category.id}`);
  }

  async function handleSaveAndNext(data: Record<string, unknown>) {
    await saveCategory(data);
    if (nextCategory) {
      router.push(`/admin/categories/${nextCategory.id}/edit`);
    } else {
      router.push(`/admin/categories#tool-${category.id}`);
    }
  }

  const catalogHref = `/admin/categories#tool-${category.id}`;

  return (
    <AdminShell title="Edit tool" description={`Editing ${category.name}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
        <Link
          href={catalogHref}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Link>

        <div className="hidden sm:block h-5 w-px bg-white/10" />

        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          {prevCategory ? (
            <Link
              href={`/admin/categories/${prevCategory.id}/edit`}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors min-w-0"
              title={prevCategory.name}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[10rem]">{prevCategory.name}</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-zinc-600">
              <ChevronLeft className="h-4 w-4" />
              First tool
            </span>
          )}

          {nextCategory ? (
            <Link
              href={`/admin/categories/${nextCategory.id}/edit`}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors min-w-0 sm:ml-auto"
              title={nextCategory.name}
            >
              <span className="truncate max-w-[10rem]">{nextCategory.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-zinc-600 sm:ml-auto">
              Last tool
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-8 max-w-3xl">
        <CategoryForm
          category={category}
          onSubmit={handleSubmit}
          onSaveAndNext={nextCategory ? handleSaveAndNext : undefined}
        />
      </div>
    </AdminShell>
  );
}
