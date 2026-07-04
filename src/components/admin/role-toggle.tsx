"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/types/database";

interface RoleToggleProps {
  userId: string;
  currentRole: UserRole;
  email: string;
  disabled?: boolean;
}

export function RoleToggle({ userId, currentRole, email, disabled }: RoleToggleProps) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(newRole: UserRole) {
    if (newRole === role) return;

    const confirmed = window.confirm(
      `Change ${email} from "${role}" to "${newRole}"?`
    );
    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");

      setRole(newRole);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={disabled || loading}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none disabled:opacity-50"
      >
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
