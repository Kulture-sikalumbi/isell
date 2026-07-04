import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { ToolRequest } from "@/types/database";

interface ToolRequestsListProps {
  requests: ToolRequest[];
}

export function ToolRequestsList({ requests }: ToolRequestsListProps) {
  const pending = requests.filter((r) => r.status === "pending");

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Tool requests from customers</h2>
      <div className="glass rounded-2xl divide-y divide-white/5">
        {pending.map((r) => (
          <div key={r.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{r.requested_name}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {r.user_email ?? "Guest"} · {formatDate(r.created_at)}
                </p>
                {r.notes && (
                  <p className="text-sm text-zinc-400 mt-2">{r.notes}</p>
                )}
              </div>
              <Badge variant="warning">Pending upload</Badge>
            </div>
            <p className="text-xs text-cyan-400/80 mt-3">
              Add this tool in Admin → Tools, then mark request fulfilled when live.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
