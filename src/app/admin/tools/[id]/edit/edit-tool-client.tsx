"use client";

import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { ToolForm } from "@/components/admin/tool-form";
import type { Tool } from "@/types/database";

interface EditToolPageProps {
  tool: Tool;
}

export function EditToolPage({ tool }: EditToolPageProps) {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/tools/${tool.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to save tool");
    }
    router.push("/admin/tools");
  }

  return (
    <AdminShell title="Edit Tool" description={`Editing ${tool.name}`}>
      <div className="glass rounded-2xl p-4 sm:p-8 max-w-3xl">
        <ToolForm tool={tool} onSubmit={handleSubmit} />
      </div>
    </AdminShell>
  );
}
