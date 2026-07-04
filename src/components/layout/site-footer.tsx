import Link from "next/link";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { getCurrentProfile } from "@/lib/auth";

export async function SiteFooter() {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandWordmark size="sm" className="opacity-80" />
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/tools" className="hover:text-zinc-300 transition-colors">
              Tools
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
              Dashboard
            </Link>
            {isAdmin && (
              <Link href="/admin" className="hover:text-zinc-300 transition-colors">
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
