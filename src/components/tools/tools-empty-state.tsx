import Link from "next/link";
import { Package, Plus } from "lucide-react";

interface ToolsEmptyStateProps {
  admin?: boolean;
}

export function ToolsEmptyState({ admin }: ToolsEmptyStateProps) {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mb-4">
        <Package className="h-6 w-6 text-zinc-500" />
      </div>
      <p className="text-zinc-300 font-medium mb-2">No tools available yet</p>
      <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
        {admin
          ? "Add a tool first, then add devices with their own prices."
          : "Check back soon — new tools are being added."}
      </p>
      {admin && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/admin/categories/new"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add tool
          </Link>
          <Link
            href="/admin/categories"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white hover:brightness-110 transition-all"
          >
            Go to catalog
          </Link>
        </div>
      )}
    </div>
  );
}
