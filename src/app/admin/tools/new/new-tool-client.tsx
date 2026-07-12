"use client";

import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { ToolForm } from "@/components/admin/tool-form";
import type { ToolCategory } from "@/types/database";

interface NewToolPageClientProps {
  categories: ToolCategory[];
  defaultCategoryId?: string;
}

export function NewToolPageClient({ categories, defaultCategoryId }: NewToolPageClientProps) {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch("/api/admin/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to create device");
    }
    router.push("/admin/categories");
  }

  return (
    <AdminShell
      title="Add device"
      description="Customers will pick this device under the tool you selected — set its price and Windows/Mac download links"
    >
      <div className="glass rounded-2xl p-4 sm:p-8 max-w-3xl">
        <ToolForm
          categories={categories}
          defaultCategoryId={defaultCategoryId}
          onSubmit={handleSubmit}
        />
      </div>
    </AdminShell>
  );
}
