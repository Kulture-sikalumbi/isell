"use client";

import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { ToolForm } from "@/components/admin/tool-form";

export default function NewToolPage() {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    const res = await fetch("/api/admin/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to create tool");
    }
    router.push("/admin/tools");
  }

  return (
    <AdminShell title="Add New Tool" description="Configure tool and developer API settings">
      <div className="glass rounded-2xl p-4 sm:p-8 max-w-3xl">
        <ToolForm onSubmit={handleSubmit} />
      </div>
    </AdminShell>
  );
}
