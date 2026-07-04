import Link from "next/link";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { SiteNav, type SiteNavUser } from "@/components/layout/site-nav";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  let navUser: SiteNavUser | null = null;

  if (user) {
    navUser = {
      name:
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Account",
      email: user.email ?? "",
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      isAdmin: profile?.role === "admin",
    };
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#0a0b10] shadow-lg shadow-black/30">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group transition-opacity hover:opacity-90 min-w-0 shrink-0">
          <BrandWordmark size="md" className="text-base sm:text-lg" />
        </Link>
        <SiteNav user={navUser} />
      </div>
    </header>
  );
}
