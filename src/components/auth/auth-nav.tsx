import Link from "next/link";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { UserMenu } from "@/components/auth/user-menu";

export async function AuthNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="text-sm text-zinc-400 hover:text-white transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const profile = await getCurrentProfile();
  const name =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Account";

  const avatarUrl =
    user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  return (
    <UserMenu
      email={user.email ?? ""}
      name={name}
      avatarUrl={avatarUrl}
      isAdmin={profile?.role === "admin"}
    />
  );
}
