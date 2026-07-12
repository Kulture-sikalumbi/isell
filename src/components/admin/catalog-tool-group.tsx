import Link from "next/link";
import { ExternalLink, Monitor, Apple, Pencil, Plus, Star } from "lucide-react";
import { CategoryActions } from "@/components/admin/category-actions";
import { QuickPriceEdit } from "@/components/admin/quick-price-edit";
import { ToolActions } from "@/components/admin/tool-actions";
import { Badge } from "@/components/ui/badge";
import { formatActivationEtaShort } from "@/lib/activation-time";
import type { ToolCategory } from "@/types/database";
import type { ToolWithCategory } from "@/types/database";

interface CatalogToolGroupProps {
  category: ToolCategory;
  devices: ToolWithCategory[];
}

export function CatalogToolGroup({ category, devices }: CatalogToolGroupProps) {
  const hasWin = Boolean(category.download_url?.trim());
  const hasMac = Boolean(category.download_url_mac?.trim());

  return (
    <section className="glass rounded-2xl overflow-hidden border border-white/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-white">{category.name}</h2>
            <Badge variant={category.is_active ? "success" : "default"}>
              {category.is_active ? "Live" : "Hidden"}
            </Badge>
            {category.is_featured && (
              <Badge variant="info" className="gap-1">
                <Star className="h-3 w-3" />
                Featured
              </Badge>
            )}
            <span className="text-xs text-zinc-500">
              {devices.length} device{devices.length !== 1 ? "s" : ""}
            </span>
          </div>
          {category.description && (
            <p className="text-sm text-zinc-500 line-clamp-2">{category.description}</p>
          )}
          {(hasWin || hasMac) && (
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-500">
              {hasWin && (
                <span className="inline-flex items-center gap-1">
                  <Monitor className="h-3 w-3 text-cyan-400" />
                  Windows link set
                </span>
              )}
              {hasMac && (
                <span className="inline-flex items-center gap-1">
                  <Apple className="h-3 w-3 text-cyan-400" />
                  Mac link set
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={`/tools?category=${category.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview
          </Link>
          <Link
            href={`/admin/categories/${category.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit tool
          </Link>
          <Link
            href={`/admin/tools/new?category=${category.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/25 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/25 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add device
          </Link>
          <CategoryActions categoryId={category.id} categoryName={category.name} />
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="px-4 sm:px-6 py-10 text-center">
          <p className="text-sm text-zinc-400 mb-3">No devices under this tool yet.</p>
          <Link
            href={`/admin/tools/new?category=${category.slug}`}
            className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
          >
            <Plus className="h-4 w-4" />
            Add first device
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-white/5 text-left text-zinc-500">
                <th className="px-4 sm:px-6 py-3 font-medium">Device</th>
                <th className="px-4 sm:px-6 py-3 font-medium">Price</th>
                <th className="px-4 sm:px-6 py-3 font-medium">Activation</th>
                <th className="px-4 sm:px-6 py-3 font-medium">Mode</th>
                <th className="px-4 sm:px-6 py-3 font-medium">Status</th>
                <th className="px-4 sm:px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr
                  key={device.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 sm:px-6 py-3">
                    <div className="font-medium text-white">{device.name}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <QuickPriceEdit toolId={device.id} initialPrice={Number(device.retail_price)} />
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-zinc-300 capitalize">
                    {formatActivationEtaShort(
                      device.activation_time_value,
                      device.activation_time_unit
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <Badge variant={device.fulfillment_mode === "manual" ? "info" : "default"}>
                      {device.fulfillment_mode === "manual" ? "Manual" : "API"}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <Badge variant={device.is_active ? "success" : "default"}>
                      {device.is_active ? "Live" : "Hidden"}
                    </Badge>
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <ToolActions toolId={device.id} toolName={device.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
