"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailHealth {
  resendConfigured: boolean;
  resendKeyLength?: number;
  emailFrom: string | null;
  emailFromFormatted: string;
  appUrl: string | null;
  serviceRoleConfigured: boolean;
  ready: boolean;
  detectedKeyNames?: string[];
  hint?: string;
  emailConfigSource?: {
    resendApiKey: string;
    emailFrom: string;
    appUrl: string;
  };
}

export function EmailHealthPanel() {
  const [health, setHealth] = useState<EmailHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/email-health", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load email status");
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load email status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendTest() {
    setTesting(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/email-health", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.hint ? `${data.error} — ${data.hint}` : data.error || "Test email failed");
      setMessage(`Test email sent to ${data.sentTo}. Check inbox and spam.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test email failed");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Mail className="h-4 w-4 text-cyan-400" />
            Email (Resend)
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Checks whether this server can send email in production.
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && !health ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking server config…
        </div>
      ) : health ? (
        <>
          <ul className="space-y-2 text-sm mb-4">
            <StatusRow
              ok={health.resendConfigured}
              label={`RESEND_API_KEY on server${health.resendKeyLength ? ` (${health.resendKeyLength} chars)` : ""}`}
            />
            <StatusRow ok={Boolean(health.emailFrom)} label={`EMAIL_FROM (${health.emailFrom ?? "missing"})`} />
            <StatusRow ok={health.serviceRoleConfigured} label="SUPABASE_SERVICE_ROLE_KEY on server" />
            <StatusRow ok={Boolean(health.appUrl)} label={`NEXT_PUBLIC_APP_URL (${health.appUrl ?? "missing"})`} />
          </ul>
          {health.detectedKeyNames && health.detectedKeyNames.length > 0 && (
            <p className="text-[11px] text-zinc-500 mb-4 break-all">
              Server sees env keys: {health.detectedKeyNames.join(", ")}
            </p>
          )}
          {health.emailConfigSource && (
            <p className="text-[11px] text-amber-300/90 mb-4">
              Config source — Resend key: {health.emailConfigSource.resendApiKey}, From:{" "}
              {health.emailConfigSource.emailFrom}, App URL: {health.emailConfigSource.appUrl}
            </p>
          )}
        </>
      ) : null}

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}
      {message && (
        <p className="text-sm text-emerald-400 mb-3">{message}</p>
      )}

      <Button type="button" size="sm" onClick={sendTest} disabled={testing || !health?.ready}>
        {testing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Sending test…
          </>
        ) : (
          "Send test email to me"
        )}
      </Button>
    </div>
  );
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-zinc-300">
      <span className={ok ? "text-emerald-400" : "text-red-400"}>{ok ? "✓" : "✗"}</span>
      <span className="text-xs sm:text-sm break-all">{label}</span>
    </li>
  );
}
