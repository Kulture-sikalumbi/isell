import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { CatalogToolGroup } from "@/components/admin/catalog-tool-group";
import { FeaturedToolsPanel } from "@/components/admin/featured-tools-panel";
import { getAllCategories, getAllTools } from "@/lib/data";

export const metadata = { title: "Catalog — Admin" };

export default async function AdminCatalogPage() {
  const [categories, allDevices] = await Promise.all([getAllCategories(), getAllTools()]);

  const devicesByTool = new Map<string, typeof allDevices>();
  for (const device of allDevices) {
    if (!device.category_id) continue;
    const list = devicesByTool.get(device.category_id) ?? [];
    list.push(device);
    devicesByTool.set(device.category_id, list);
  }

  return (
    <AdminShell
      title="Catalog"
      description="Tools are what customers browse. Devices are the models they buy — each with its own price and download link."
      action={
        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 sm:px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add tool
        </Link>
      }
    >
      <div className="mb-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100/90">
        <strong className="text-cyan-200">How it works:</strong>{" "}
        Create a <strong>tool</strong> with Windows + Mac download links → add{" "}
        <strong>devices</strong> under it (iPhone 13, iPad Air…) → mark tools as{" "}
        <strong>featured</strong> for the homepage.
      </div>

      {categories.length > 0 && (
        <FeaturedToolsPanel categories={categories} devicesByTool={devicesByTool} />
      )}

      {categories.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-zinc-300 font-medium mb-2">Your catalog is empty</p>
          <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
            Start by adding a tool name. You can then add devices with different prices and
            download links under that tool.
          </p>
          <Link
            href="/admin/categories/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Add your first tool
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <CatalogToolGroup
              key={category.id}
              category={category}
              devices={devicesByTool.get(category.id) ?? []}
            />
          ))}
        </div>
      )}
    </AdminShell>
  );
}
