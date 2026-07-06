import Link from "next/link";
import { ArrowRight, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StorefrontTool } from "@/lib/storefront-tool";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface VariationToolRowProps {
  tool: StorefrontTool;
  highlight?: string;
}

const accentColors = [
  "from-cyan-500/20 to-cyan-500/5",
  "from-violet-500/20 to-violet-500/5",
  "from-fuchsia-500/20 to-fuchsia-500/5",
  "from-amber-500/20 to-amber-500/5",
];

function HighlightText({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight?.trim()) return <>{text}</>;

  const q = highlight.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-cyan-500/25 text-cyan-200 rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function VariationToolRow({ tool, highlight }: VariationToolRowProps) {
  const colorIndex =
    tool.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    accentColors.length;

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="block group"
    >
      <div
        className={cn(
          "flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5 sm:py-5",
          "hover:border-cyan-500/30 hover:bg-white/[0.05] transition-colors"
        )}
      >
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br border border-white/10",
            accentColors[colorIndex]
          )}
        >
          {tool.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tool.icon_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <Cpu className="h-5 w-5 text-white/80" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
            <HighlightText text={tool.name} highlight={highlight} />
          </h3>
          {tool.description && (
            <p className="text-sm text-zinc-500 mt-0.5 line-clamp-1 hidden sm:block">
              <HighlightText text={tool.description} highlight={highlight} />
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="warning" className="text-xs font-semibold px-3 py-1">
            {formatCurrency(tool.checkout_price)}
          </Badge>
          <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-cyan-400 transition-colors hidden sm:block" />
        </div>
      </div>
    </Link>
  );
}
