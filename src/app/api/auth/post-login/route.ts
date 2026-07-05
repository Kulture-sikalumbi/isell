import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser, isAdmin } from "@/lib/auth";
import { resolvePostLoginPath, sanitizeNextPath } from "@/lib/post-login";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ path: "/auth/login" }, { status: 401 });
  }

  const profile = await getCurrentProfile();
  const { searchParams } = new URL(request.url);
  const next = sanitizeNextPath(searchParams.get("next"));

  return NextResponse.json({
    path: resolvePostLoginPath(next, isAdmin(profile?.role)),
    isAdmin: isAdmin(profile?.role),
  });
}
