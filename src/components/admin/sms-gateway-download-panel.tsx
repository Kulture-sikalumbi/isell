import { Download, ExternalLink, Smartphone } from "lucide-react";
import { getSmsGatewayApkDownloadUrl } from "@/lib/momo-sms-gateway";

export function SmsGatewayDownloadPanel() {
  const downloadUrl = getSmsGatewayApkDownloadUrl();

  return (
    <section className="glass rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/[0.03]">
      <div className="flex items-start gap-3 mb-5">
        <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-400">
          <Smartphone className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">SMS Forwarder (Android)</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Install on the merchant phone that receives MTN / Airtel deposit SMS. This page is
            admin-only — customers never see it.
          </p>
        </div>
      </div>

      {downloadUrl ? (
        <div className="space-y-4">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-500 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Download className="h-5 w-5" />
            Download APK
            <ExternalLink className="h-4 w-4 opacity-70" />
          </a>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Download source</p>
            <p className="break-all text-zinc-400">{downloadUrl}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 text-sm text-amber-100/90">
          <p className="font-semibold text-amber-200 text-base">APK link not set yet</p>
          <ol className="mt-3 space-y-2 text-sm text-amber-100/80 list-decimal list-inside">
            <li>Upload <code className="text-amber-200">app-release.apk</code> to GitHub Releases.</li>
            <li>Copy the direct asset URL (ends in <code className="text-amber-200">.apk</code>).</li>
            <li>
              In Azure App Settings, add{" "}
              <code className="text-amber-200">MOMO_SMS_GATEWAY_APK_URL</code> with that URL.
            </li>
            <li>Restart the web app — the download button will appear here.</li>
          </ol>
        </div>
      )}

      <div className="mt-5 pt-5 border-t border-white/10 text-sm text-zinc-500">
        After install: open the app → grant SMS permissions → set gateway to{" "}
        <strong className="text-zinc-400">ACTIVE</strong> → paste the same bearer token as Azure{" "}
        <code className="text-zinc-400">MOMO_SMS_GATEWAY_TOKEN</code> in Settings.
      </div>
    </section>
  );
}
