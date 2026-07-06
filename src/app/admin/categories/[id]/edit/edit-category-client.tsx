"use client";

import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { CategoryForm } from "@/components/admin/category-form";
import type { ToolCategory } from "@/types/database";

interface EditCategoryPageProps {
  category: ToolCategory;
}

export function EditCategoryPage({ category }: EditCategoryPageProps) {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to save category");
    }
    router.push("/admin/categories");
  }

  return (
    <AdminShell title="Edit tool" description={`Editing ${category.name}`}>
      <div className="glass rounded-2xl p-4 sm:p-8 max-w-3xl">
        <CategoryForm category={category} onSubmit={handleSubmit} />
      </div>
    </AdminShell>
  );
}
