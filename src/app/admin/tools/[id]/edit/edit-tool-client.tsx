"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { ToolForm } from "@/components/admin/tool-form";
import type { Tool, ToolCategory } from "@/types/database";

interface NeighborDevice {
  id: string;
  name: string;
}

interface EditToolPageProps {
  tool: Tool;
  categories: ToolCategory[];
  prevDevice: NeighborDevice | null;
  nextDevice: NeighborDevice | null;
}

export function EditToolPage({ tool, categories, prevDevice, nextDevice }: EditToolPageProps) {
  const router = useRouter();

  async function saveTool(data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/tools/${tool.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to save tool");
    }
  }

  async function handleSubmit(data: Record<string, unknown>) {
    await saveTool(data);
    router.push(`/admin/categories#device-${tool.id}`);
  }

  async function handleSaveAndNext(data: Record<string, unknown>) {
    await saveTool(data);
    if (nextDevice) {
      router.push(`/admin/tools/${nextDevice.id}/edit`);
    } else {
      router.push(`/admin/categories#device-${tool.id}`);
    }
  }

  const catalogHref = `/admin/categories#device-${tool.id}`;

  return (
    <AdminShell title="Edit device" description={`Editing ${tool.name}`}>
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
          {prevDevice ? (
            <Link
              href={`/admin/tools/${prevDevice.id}/edit`}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors min-w-0"
              title={prevDevice.name}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="truncate max-w-[10rem]">{prevDevice.name}</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-zinc-600">
              <ChevronLeft className="h-4 w-4" />
              First device
            </span>
          )}

          {nextDevice ? (
            <Link
              href={`/admin/tools/${nextDevice.id}/edit`}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors min-w-0 sm:ml-auto"
              title={nextDevice.name}
            >
              <span className="truncate max-w-[10rem]">{nextDevice.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-zinc-600 sm:ml-auto">
              Last device
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-8 max-w-3xl">
        <ToolForm
          tool={tool}
          categories={categories}
          onSubmit={handleSubmit}
          onSaveAndNext={nextDevice ? handleSaveAndNext : undefined}
        />
      </div>
    </AdminShell>
  );
}
