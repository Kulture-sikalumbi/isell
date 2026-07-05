"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/tools";
  const error = searchParams.get("error");
  const reason = searchParams.get("reason");

  return (
    <section className="pt-28 pb-20 flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <BrandWordmark size="lg" />
          </div>
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-zinc-400 mt-2">
            Use your Google account to access your activations
          </p>
        </div>

        <div className="glass rounded-2xl p-8">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-5">
              Sign-in failed. Please try again.
              {reason && (
                <p className="mt-1 text-xs text-red-400/70 break-words">{reason}</p>
              )}
            </div>
          )}

          <GoogleSignInButton next={next} />

          <p className="text-center text-xs text-zinc-500 mt-6 leading-relaxed">
            Google is the only sign-in method for this platform.
          </p>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          <Link href="/tools" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Browse tools without signing in
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
