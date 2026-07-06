"use client";

import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { CategoryForm } from "@/components/admin/category-form";

export default function NewCategoryPage() {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to create category");
    }
    router.push("/admin/categories");
  }

  return (
    <AdminShell
      title="Add tool"
      description="The tool name is what customers see in the sidebar — e.g. SMD Bypass iCloud [iPhone - iPad]"
    >
      <div className="glass rounded-2xl p-4 sm:p-8 max-w-3xl">
        <CategoryForm onSubmit={handleSubmit} />
      </div>
    </AdminShell>
  );
}
