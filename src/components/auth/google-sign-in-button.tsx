"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  next?: string;
  label?: string;
}

interface CredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>
          ) => void;
        };
      };
    };
  }
}

/**
 * Uses Google Identity Services directly (not Supabase OAuth redirect).
 * This shows your Google Console app name instead of *.supabase.co
 */
export function GoogleSignInButton({
  next = "/tools",
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredential = useCallback(
    async (response: CredentialResponse) => {
      setLoading(true);
      setError("");

      if (!isSupabaseConfigured()) {
        setError("Supabase is not configured");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        setError("Could not initialize auth client");
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      await supabase.auth.getSession();

      try {
        const res = await fetch(`/api/auth/post-login?next=${encodeURIComponent(next)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        window.location.href = data.path || next;
      } catch {
        window.location.href = next;
      }
    },
    [next]
  );

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    function initGoogle() {
      if (!window.google?.accounts?.id || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId!,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: Math.min(buttonRef.current.offsetWidth || 320, 400),
      });

      setScriptReady(true);
    }

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", initGoogle);
      return () => existing.removeEventListener("load", initGoogle);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [clientId, handleCredential]);

  if (!clientId) {
    return (
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
        Add <code className="text-amber-200">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to your{" "}
        <code className="text-amber-200">.env</code> file (same Client ID from Google Cloud
        Console).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative flex justify-center min-h-[44px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0f1016]/80 rounded-xl z-10">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          </div>
        )}
        <div
          ref={buttonRef}
          className={`w-full flex justify-center ${!scriptReady ? "opacity-0" : "opacity-100"} transition-opacity`}
        />
        {!scriptReady && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <p className="text-center text-xs text-zinc-500">
        Sign in directly with your Google account — no Supabase redirect.
      </p>
    </div>
  );
}
