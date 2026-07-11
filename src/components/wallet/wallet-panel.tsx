"use client";

import { useEffect } from "react";
import { DepositForm } from "@/components/wallet/deposit-form";
import { WalletBalanceCard } from "@/components/wallet/wallet-balance-card";

interface WalletPanelProps {
  balance: number;
  currency: string;
  merchants: {
    mtn: string;
    airtel: string;
    binancePayId: string;
    usdtTrc20Address: string;
    currency: string;
  };
  pendingDepositCount: number;
}

export function WalletPanel({
  balance,
  currency,
  merchants,
  pendingDepositCount,
}: WalletPanelProps) {
  useEffect(() => {
    if (window.location.hash === "#wallet-deposit") {
      const el = document.getElementById("wallet-deposit");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="space-y-6">
      <WalletBalanceCard
        balance={balance}
        currency={currency}
        pendingCount={pendingDepositCount}
      />

      <div id="wallet-deposit" className="scroll-mt-28">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-white">Add funds</h2>
            <p className="text-xs text-zinc-500 mt-0.5">MTN, Airtel, Binance Pay, or USDT (TRC20)</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 sm:p-6 border border-white/10">
          <DepositForm merchants={merchants} currency={merchants.currency} />
        </div>
      </div>
    </div>
  );
}
