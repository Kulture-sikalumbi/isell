import { redirect } from "next/navigation";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export async function getCurrentUser() {
  const supabase = await createAuthClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const authClient = await createAuthClient();
  if (!authClient) return null;

  const { data: profile } = await authClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

export function isAdmin(role?: UserRole | null) {
  return role === "admin";
}

export async function requireUser(redirectTo = "/auth/login") {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!isAdmin(profile?.role)) {
    redirect("/dashboard?error=admin_required");
  }

  return { user, profile: profile! };
}

/** For API routes — returns null if not admin */
export async function getAdminUser() {
  const user = await getCurrentUser();
  if (!user) return null;

  const service = createServiceClient();
  if (!service) return null;

  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdmin((profile as { role: UserRole } | null)?.role)) return null;

  return user;
}

/** Email addresses for all accounts with role = admin in profiles */
export async function getAdminEmails(): Promise<string[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "admin");

  if (error || !data) return [];

  return data
    .map((p) => p.email?.trim())
    .filter((email): email is string => Boolean(email));
}
