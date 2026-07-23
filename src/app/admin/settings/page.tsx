import { AdminShell } from "@/components/admin/admin-sidebar";
import { CurrencyRateForm } from "@/components/admin/currency-rate-form";
import { MerchantAccountsForm } from "@/components/admin/merchant-accounts-form";
import { getCurrencyRateSettings, getMerchantDepositSettings } from "@/lib/site-settings";

export const metadata = { title: "Settings — Admin" };

export default async function AdminSettingsPage() {
  const [settings, merchantSettings] = await Promise.all([
    getCurrencyRateSettings(),
    getMerchantDepositSettings(),
  ]);
  const rate = settings.usdToZmwRate;

  return (
    <AdminShell title="Settings" description="Exchange rate and customer deposit accounts">
      <div className="max-w-2xl space-y-6">
        <section className="glass rounded-2xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-2">Customer deposit accounts</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Numbers and addresses shown when customers add wallet funds. Values saved here override
            Azure environment variables. Leave a field empty to fall back to env (if set).
          </p>
          <MerchantAccountsForm initial={merchantSettings} />
          {merchantSettings.updatedAt && (
            <p className="mt-4 text-xs text-zinc-500">
              Last saved {new Date(merchantSettings.updatedAt).toLocaleString()}
            </p>
          )}
        </section>

        <section className="glass rounded-2xl p-6 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-2">USD to ZMW exchange rate</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Used when funds land in a different currency than the wallet (and for UI display).
            Each deposit locks the rate at confirm time — later rate changes do not revalue past
            balances. Live FX updates this automatically; override here if needed.
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