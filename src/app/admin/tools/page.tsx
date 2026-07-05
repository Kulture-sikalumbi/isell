import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { ToolActions } from "@/components/admin/tool-actions";
import { ToolsEmptyState } from "@/components/tools/tools-empty-state";
import { Badge } from "@/components/ui/badge";
import { getAllTools } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Manage Tools — Admin" };

export default async function AdminToolsPage() {
  const tools = await getAllTools();

  return (
    <AdminShell
      title="Tools"
      description="Add, edit, and remove tools from the catalog"
      action={
        <Link
          href="/admin/tools/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 sm:px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Tool
        </Link>
      }
    >
      {tools.length === 0 ? (
        <ToolsEmptyState admin />
      ) : (
      <div className="glass rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-white/5 text-left text-zinc-500">
              <th className="px-4 sm:px-6 py-4 font-medium">Name</th>
              <th className="px-4 sm:px-6 py-4 font-medium">Mode</th>
              <th className="px-4 sm:px-6 py-4 font-medium">Retail</th>
              <th className="px-4 sm:px-6 py-4 font-medium">Platform cut</th>
              <th className="px-4 sm:px-6 py-4 font-medium">Margin</th>
              <th className="px-4 sm:px-6 py-4 font-medium">Status</th>
              <th className="px-4 sm:px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => {
              const margin = tool.retail_price - tool.wholesale_cost;
              const marginPct = ((margin / tool.retail_price) * 100).toFixed(0);
              return (
                <tr key={tool.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="font-medium text-white">{tool.name}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">{tool.slug}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <Badge variant={tool.fulfillment_mode === "manual" ? "info" : "default"}>
                      {tool.fulfillment_mode === "manual" ? "Manual" : "Direct API"}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-white">{formatCurrency(tool.retail_price)}</td>
                  <td className="px-4 sm:px-6 py-4 text-cyan-400">
                    {tool.platform_fee_percent != null
                      ? `${tool.platform_fee_percent}%`
                      : "—"}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-emerald-400">
                    {formatCurrency(margin)} ({marginPct}%)
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <Badge variant={tool.is_active ? "success" : "default"}>
                      {tool.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <ToolActions toolId={tool.id} toolName={tool.name} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </AdminShell>
  );
}
