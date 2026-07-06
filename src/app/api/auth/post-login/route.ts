import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser, isAdmin } from "@/lib/auth";
import { resolvePostLoginPath, sanitizeNextPath } from "@/lib/post-login";
import { sendWelcomeEmailIfNeeded } from "@/lib/welcome-email";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ path: "/auth/login" }, { status: 401 });
  }

  void sendWelcomeEmailIfNeeded(user.id).catch((err) =>
    console.error("[welcome-email]", err)
  );

  const profile = await getCurrentProfile();
  const { searchParams } = new URL(request.url);
  const next = sanitizeNextPath(searchParams.get("next"));

  return NextResponse.json({
    path: resolvePostLoginPath(next, isAdmin(profile?.role)),
    isAdmin: isAdmin(profile?.role),
  });
}
