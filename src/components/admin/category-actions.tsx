"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { AlertDialog, ConfirmDialog } from "@/components/ui/confirm-dialog";

interface CategoryActionsProps {
  categoryId: string;
  categoryName: string;
}

export function CategoryActions({ categoryId, categoryName }: CategoryActionsProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setConfirmOpen(false);
      router.refresh();
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
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
        disabled={deleting}
        className="rounded-lg p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        title="Delete tool"
      >
        {deleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete tool?"
        description={
          <>
            Remove <span className="text-white font-medium">&ldquo;{categoryName}&rdquo;</span>?
            You must delete all devices under it first.
          </>
        }
        confirmLabel="Delete tool"
        variant="danger"
        loading={deleting}
        error={error}
        onConfirm={handleDelete}
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Could not delete tool"
        message={alertMessage}
        variant="error"
      />
    </>
  );
}
