"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, Shield } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";

interface UserMenuProps {
  email: string;
  name: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}

export function UserMenu({ email, name, avatarUrl, isAdmin }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 hover:bg-white/10 transition-colors"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-xs font-bold text-white">
            {initials}
          </div>
        )}
        <span className="hidden sm:block max-w-[120px] truncate text-sm text-zinc-200">
          {name}
        </span>
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-64 glass rounded-xl border border-white/10 p-2 shadow-xl">
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              <p className="text-xs text-zinc-500 truncate">{email}</p>
            </div>

            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
            >
              <LayoutDashboard className="h-4 w-4" />
              My Activations
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
            )}

            <div className="mt-1 border-t border-white/5 pt-1">
              <SignOutButton className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
