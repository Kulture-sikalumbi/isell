import { Info } from "lucide-react";
import { WALLET_DEPOSIT_TERMS } from "@/lib/wallet-policy";

export function WalletTermsNotice() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
      <p className="flex items-center gap-2 text-zinc-300 font-medium mb-2">
        <Info className="h-4 w-4 text-cyan-400 shrink-0" />
        Wallet terms
      </p>
      <ul className="space-y-1.5 list-disc list-inside text-xs leading-relaxed">
        {WALLET_DEPOSIT_TERMS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
