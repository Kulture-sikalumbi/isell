import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolvePostLoginPath, sanitizeNextPath } from "@/lib/post-login";
import { sendWelcomeEmailIfNeeded } from "@/lib/welcome-email";

function profileIsAdmin(role: string | null | undefined) {
  return role === "admin";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/tools";
  const safeNext = sanitizeNextPath(next);

  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  if (oauthError) {
    const reason = oauthErrorDescription || oauthError;
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth&reason=${encodeURIComponent(reason)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth&reason=${encodeURIComponent(
        "missing_code — check Supabase Redirect URLs include http://localhost:3000/auth/callback"
      )}`
    );
  }

  const redirectUrl = `${origin}${safeNext}`;
  let redirectTarget = redirectUrl;
  let response = NextResponse.redirect(redirectTarget);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth&reason=${encodeURIComponent("Supabase not configured")}`
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(redirectTarget);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error.message);
    return NextResponse.redirect(
      `${origin}/auth/login?error=auth&reason=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = safeNext;
  if (user) {
    try {
      await sendWelcomeEmailIfNeeded(user.id);
    } catch (err) {
      console.error("[welcome-email]", err);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    destination = resolvePostLoginPath(safeNext, profileIsAdmin(profile?.role));
  }

  if (destination !== safeNext) {
    redirectTarget = `${origin}${destination}`;
    const redirected = NextResponse.redirect(redirectTarget);
    response.cookies.getAll().forEach(({ name, value }) => {
      redirected.cookies.set(name, value);
    });
    response = redirected;
  }

  return response;
}
