"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AlertDialog, ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useNavigationLoading } from "@/components/layout/navigation-progress";
import type { UserRole } from "@/types/database";

interface RoleToggleProps {
  userId: string;
  currentRole: UserRole;
  email: string;
  disabled?: boolean;
}

export function RoleToggle({ userId, currentRole, email, disabled }: RoleToggleProps) {
  const router = useRouter();
  const { runWithLoading } = useNavigationLoading();
  const [role, setRole] = useState(currentRole);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  function requestRoleChange(newRole: UserRole) {
    if (newRole === role) return;
    setPendingRole(newRole);
    setError(null);
    setConfirmOpen(true);
  }

  async function confirmRoleChange() {
    if (!pendingRole) return;

    setLoading(true);
    setError(null);

    try {
      await runWithLoading(async () => {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: pendingRole }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update role");

        setRole(pendingRole);
        setConfirmOpen(false);
        setPendingRole(null);
        router.refresh();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      setError(message);
      setAlertMessage(message);
      setAlertOpen(true);
    } finally {
      setLoading(false);
    }
  }

  function cancelRoleChange() {
    setConfirmOpen(false);
    setPendingRole(null);
    setError(null);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={role}
          disabled={disabled || loading}
          onChange={(e) => requestRoleChange(e.target.value as UserRole)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none disabled:opacity-50"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) cancelRoleChange();
        }}
        title="Change user role?"
        description={
          pendingRole ? (
            <>
              Change <span className="text-white font-medium">{email}</span> from{" "}
              <span className="text-zinc-200 capitalize">{role}</span> to{" "}
              <span className="text-zinc-200 capitalize">{pendingRole}</span>?
            </>
          ) : null
        }
        confirmLabel="Change role"
        loading={loading}
        error={error}
        onConfirm={confirmRoleChange}
      />

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Could not update role"
        message={alertMessage}
        variant="error"
      />
    </>
  );
}
