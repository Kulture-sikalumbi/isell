"use client";

import { LogOut } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  return (
    <form action="/api/auth/signout" method="POST">
      <button
        type="submit"
        className={
          className ??
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        }
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </form>
  );
}
