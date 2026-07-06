"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useNavigationLoading } from "@/components/layout/navigation-progress";

interface ToolActionsProps {
  toolId: string;
  toolName: string;
}

export function ToolActions({ toolId, toolName }: ToolActionsProps) {
  const router = useRouter();
  const { runWithLoading } = useNavigationLoading();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      await runWithLoading(async () => {
        const res = await fetch(`/api/admin/tools/${toolId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Delete failed");
        setConfirmOpen(false);
        router.refresh();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
      setAlertMessage(message);
      setAlertOpen(true);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/tools/${toolId}/edit`}
          className="rounded-lg p-2 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          title="Edit device"
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
          disabled={deleting}
          className="rounded-lg p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          title="Delete device"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete device?"
        description={
          <>
            Remove <span className="text-white font-medium">&ldquo;{toolName}&rdquo;</span>? This
            cannot be undone.
          </>
        }
        confirmLabel="Delete device"
        variant="danger"
        loading={deleting}
        error={error}
        onConfirm={handleDelete}
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Could not delete device"
        message={alertMessage}
        variant="error"
      />
    </>
  );
}
