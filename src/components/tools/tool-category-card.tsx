import { ChevronRight } from "lucide-react";
import { AdminStorefrontEditButton } from "@/components/tools/admin-storefront-edit-button";
import { CategoryLogo } from "@/components/tools/category-logo";
import { cn } from "@/lib/utils";
import type { ToolCategoryWithTools } from "@/lib/data";

interface ToolCategoryCardProps {
  category: ToolCategoryWithTools;
  onSelect: () => void;
  isAdmin?: boolean;
}

const accentColors = [
  "from-cyan-500/25 to-cyan-500/5",
  "from-violet-500/25 to-violet-500/5",
  "from-fuchsia-500/25 to-fuchsia-500/5",
  "from-amber-500/25 to-amber-500/5",
  "from-emerald-500/25 to-emerald-500/5",
  "from-rose-500/25 to-rose-500/5",
];

export function ToolCategoryCard({ category, onSelect, isAdmin }: ToolCategoryCardProps) {
  const colorIndex =
    category.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    accentColors.length;

  return (
    <div className="relative group w-full">
      <button
        type="button"
        data-global-loading
        onClick={onSelect}
        className="group w-full text-left"
      >
      <div
        className={cn(
          "glass glass-hover rounded-2xl p-5 sm:p-6 h-full flex items-center gap-4",
          "border border-white/10 hover:border-cyan-500/30 transition-all"
        )}
      >
        <CategoryLogo
          iconUrl={category.icon_url}
          name={category.name}
          accentClass={accentColors[colorIndex]}
        />

        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
            {category.name}
          </h3>
          {category.description ? (
            <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{category.description}</p>
          ) : (
            <p className="text-sm text-zinc-500 mt-1">
              {category.tools.length} device{category.tools.length !== 1 ? "s" : ""} available
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-300 tabular-nums">
            {category.tools.length}
          </span>
          <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
        </div>
      </div>
      </button>
      {isAdmin && (
        <AdminStorefrontEditButton
          href={`/admin/categories/${category.id}/edit`}
          label={`Edit ${category.name}`}
          className="absolute top-3 right-3 z-10"
          size="sm"
        />
      )}
    </div>
  );
}
