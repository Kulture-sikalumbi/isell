import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminQuickActionProps {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: "cyan" | "violet" | "amber" | "emerald";
  badge?: string | number;
  external?: boolean;
}

const accents = {
  cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20 hover:border-cyan-500/35",
  violet: "from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20 hover:border-violet-500/35",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20 hover:border-amber-500/35",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/35",
};

export function AdminQuickAction({
  href,
  title,
  description,
  icon: Icon,
  accent = "cyan",
  badge,
  external,
}: AdminQuickActionProps) {
  const className = cn(
    "group flex items-start gap-4 rounded-2xl border bg-white/[0.02] p-4 sm:p-5 transition-colors",
    accents[accent]
  );

  const content = (
    <>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br border border-white/10",
          accents[accent].split(" ").slice(0, 2).join(" ")
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white group-hover:text-cyan-200 transition-colors">
            {title}
          </h3>
          {badge !== undefined && Number(badge) > 0 && (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 tabular-nums">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600 group-hover:text-white transition-colors mt-0.5" />
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
