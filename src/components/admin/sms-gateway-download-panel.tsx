import { Download, ExternalLink, Smartphone } from "lucide-react";
import { getSmsGatewayApkDownloadUrl } from "@/lib/momo-sms-gateway";

export function SmsGatewayDownloadPanel() {
  const downloadUrl = getSmsGatewayApkDownloadUrl();

  return (
    <section className="glass rounded-2xl p-6 border border-white/10">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">SMS Forwarder app</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Install on the merchant phone that receives MTN / Airtel deposit SMS. Only visible to
            admins — customers never see this link.
          </p>
        </div>
      </div>

      {downloadUrl ? (
        <div className="space-y-3">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-400 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download APK
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
          <p className="text-xs text-zinc-500 break-all">
            Source: {downloadUrl}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200">Download link not configured</p>
          <p className="mt-1 text-xs text-amber-100/70">
            Upload the release APK on GitHub, then set{" "}
            <code className="text-amber-200">MOMO_SMS_GATEWAY_APK_URL</code> in Azure App Settings to
            the direct download URL.
          </p>
        </div>
      )}
    </section>
  );
}
