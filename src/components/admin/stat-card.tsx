import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  accent?: "cyan" | "violet" | "emerald" | "amber";
}

const accents = {
  cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-400",
  violet: "from-violet-500/20 to-violet-500/5 text-violet-400",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-400",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "cyan",
}: StatCardProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br border border-white/10",
            accents[accent]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-emerald-400">{trend}</span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-zinc-500">{label}</div>
    </div>
  );
}
