import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  // Supabase often redirects to Site URL (/) with ?code= — forward to our callback
  if (code && pathname !== "/auth/callback") {
    const callbackUrl = new URL("/auth/callback", request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    return NextResponse.redirect(callbackUrl);
  }

  if (oauthError && pathname !== "/auth/login" && pathname !== "/auth/callback") {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("error", "auth");
    loginUrl.searchParams.set(
      "reason",
      request.nextUrl.searchParams.get("error_description") || oauthError
    );
    return NextResponse.redirect(loginUrl);
  }

  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  // Only hit Supabase on protected routes — avoids fetch on every static/asset request
  if (!isDashboard && !isAdmin) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[middleware] getUser:", userError.message);
    }

    if (!user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[middleware] profile:", profileError.message);
    }

    const userIsAdmin = profile?.role === "admin";

    if (isDashboard && userIsAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (isAdmin) {
      if (!userIsAdmin) {
        return NextResponse.redirect(
          new URL("/dashboard?error=admin_required", request.url)
        );
      }
    }

    return supabaseResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[middleware] Supabase fetch failed:", message);

    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    loginUrl.searchParams.set("error", "auth_unavailable");
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
