import Link from "next/link";
import { ArrowRight, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { StorefrontTool } from "@/lib/storefront-tool";
import { ToolPrice } from "@/components/tools/tool-price";
import { getCustomerIdentifierLabel } from "@/lib/identifier-label";

interface ToolCardProps {
  tool: StorefrontTool;
  highlight?: string;
  isLoggedIn?: boolean;
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

export function ToolCard({ tool, highlight, isLoggedIn = false }: ToolCardProps) {
  const colorIndex =
    tool.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    accentColors.length;

  return (
    <Link href={`/tools/${tool.slug}`} className="block group h-full">
      <div className="glass glass-hover rounded-2xl p-5 sm:p-6 h-full flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div
            className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accentColors[colorIndex]} border border-white/10 shrink-0`}
          >
            <Cpu className="h-5 w-5 text-white/80" />
          </div>
          <Badge variant="info" className="text-[10px] shrink-0">
            {getCustomerIdentifierLabel(tool.identifier_label)}
          </Badge>
        </div>

        <h3 className="text-lg font-semibold mb-2 group-hover:text-cyan-400 transition-colors line-clamp-1">
          <HighlightText text={tool.name} highlight={highlight} />
        </h3>
        <p className="text-sm text-zinc-400 leading-relaxed mb-5 flex-1 line-clamp-2">
          <HighlightText text={tool.description ?? ""} highlight={highlight} />
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div>
            <ToolPrice
              amount={tool.checkout_price}
              isLoggedIn={isLoggedIn}
              loginNext={`/tools/${tool.slug}`}
            />
            {isLoggedIn && (
              <span className="text-xs text-zinc-500 ml-2">one-time</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-cyan-400 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            Activate
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
