"use client";

import { useEffect } from "react";
import { DepositForm } from "@/components/wallet/deposit-form";
import { PaymentMethodsPanel } from "@/components/wallet/payment-methods-panel";
import { WalletBalanceCard } from "@/components/wallet/wallet-balance-card";
import { WalletTermsNotice } from "@/components/wallet/wallet-terms-notice";
import { WithdrawForm } from "@/components/wallet/withdraw-form";
import { walletPaymentMethodsLabel } from "@/lib/wallet-payment-copy";
import type { UserPaymentMethod, WalletWithdrawal } from "@/types/database";

interface WalletPanelProps {
  balance: number;
  currency: string;
  fxRate?: number | null;
  merchants: {
    mtn: string;
    airtel: string;
    binancePayId: string;
    usdtTrc20Address: string;
    currency: string;
  };
  pendingDepositCount: number;
  paymentMethods: UserPaymentMethod[];
  pendingWithdrawal: WalletWithdrawal | null;
}

export function WalletPanel({
  balance,
  currency,
  fxRate = null,
  merchants,
  pendingDepositCount,
  paymentMethods,
  pendingWithdrawal,
}: WalletPanelProps) {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#wallet-deposit") {
      document.getElementById("wallet-deposit")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (hash === "#wallet-payment-methods") {
      document
        .getElementById("wallet-payment-methods")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (hash === "#wallet-withdraw") {
      document.getElementById("wallet-withdraw")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            <p className="text-xs text-zinc-500 mt-0.5">{walletPaymentMethodsLabel(currency)}</p>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 sm:p-6 border border-white/10">
          <DepositForm
            merchants={merchants}
            currency={currency}
            fxRate={fxRate}
            savedPaymentMethods={paymentMethods}
          />
          <div className="mt-6 pt-6 border-t border-white/10">
            <WalletTermsNotice />
          </div>
        </div>
      </div>

      <div id="wallet-payment-methods" className="scroll-mt-28">
        <div className="mb-4">
          <h2 className="font-semibold text-white">Payment methods (optional)</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pre-fill deposit sender details · required for withdrawals
          </p>
        </div>
        <div className="glass rounded-2xl p-5 sm:p-6 border border-white/10">
          <PaymentMethodsPanel initialMethods={paymentMethods} currency={currency} />
        </div>
      </div>

      <div id="wallet-withdraw" className="scroll-mt-28">
        <div className="mb-4">
          <h2 className="font-semibold text-white">Withdraw funds</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Cash out to mobile money or crypto — admin processes manually
          </p>
        </div>
        <div className="glass rounded-2xl p-5 sm:p-6 border border-white/10">
          <WithdrawForm
            balance={balance}
            currency={currency}
            paymentMethods={paymentMethods}
            pendingWithdrawal={pendingWithdrawal}
          />
        </div>
      </div>
    </div>
  );
}
