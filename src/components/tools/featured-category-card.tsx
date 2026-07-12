import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { ToolPrice } from "@/components/tools/tool-price";
import { cn, formatCurrency } from "@/lib/utils";
import type { ToolCategoryWithTools } from "@/lib/data";

interface FeaturedCategoryCardProps {
  category: ToolCategoryWithTools;
  isLoggedIn?: boolean;
}

const accentColors = [
  "from-cyan-500/20 to-cyan-500/5",
  "from-violet-500/20 to-violet-500/5",
  "from-fuchsia-500/20 to-fuchsia-500/5",
  "from-amber-500/20 to-amber-500/5",
];

export function FeaturedCategoryCard({ category, isLoggedIn = false }: FeaturedCategoryCardProps) {
  const colorIndex =
    category.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    accentColors.length;

  const prices = category.tools.map((t) => t.checkout_price).filter((p) => p >= 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const href = `/tools?category=${category.slug}`;

  return (
    <Link href={href} className="block group h-full">
      <div className="glass glass-hover rounded-2xl p-5 sm:p-6 h-full flex flex-col relative overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div
            className={cn(
              "inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br border border-white/10 shrink-0",
              accentColors[colorIndex]
            )}
          >
            <Layers className="h-5 w-5 text-white/80" />
          </div>
          <span className="text-[10px] uppercase tracking-wide text-violet-300/80 font-semibold">
            Featured
          </span>
        </div>

        <h3 className="text-lg font-semibold mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
          {category.name}
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed mb-5 flex-1 line-clamp-2">
          {category.description ||
            `${category.tools.length} device${category.tools.length !== 1 ? "s" : ""} available`}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div>
            {minPrice != null ? (
              isLoggedIn ? (
                <>
                  <span className="text-lg font-bold text-white">{formatCurrency(minPrice)}</span>
                  <span className="text-xs text-zinc-500 ml-2">from</span>
                </>
              ) : (
                <ToolPrice amount={minPrice} isLoggedIn={false} loginNext={href} />
              )
            ) : (
              <span className="text-sm text-zinc-500">Browse devices</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-cyan-400 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            View
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
