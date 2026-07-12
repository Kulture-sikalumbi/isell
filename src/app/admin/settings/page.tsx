import { AdminShell } from "@/components/admin/admin-sidebar";
import { CurrencyRateForm } from "@/components/admin/currency-rate-form";
import { getCurrencyRateSettings } from "@/lib/site-settings";

export const metadata = { title: "Settings — Admin" };

export default async function AdminSettingsPage() {
  const settings = await getCurrencyRateSettings();
  const rate = settings.usdToZmwRate;

  return (
    <AdminShell title="Settings" description="Manage live currency conversion for Zambia">
      <div className="max-w-2xl space-y-6">
        <section className="glass rounded-2xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-2">USD to ZMW exchange rate</h2>
          <p className="text-sm text-zinc-500 mb-4">
            This value is used when converting USD prices for Zambia. Live FX updates this automatically
            when available, and you can override it here if needed.
          </p>
          <CurrencyRateForm initialRate={rate} />

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-500">Current stored rate:</span>
              <strong className="text-white">{rate ? `${rate.toFixed(4)} ZMW` : "not set"}</strong>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Source: {settings.source} {settings.updatedAt ? `· Updated ${settings.updatedAt}` : ""}
            </p>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}