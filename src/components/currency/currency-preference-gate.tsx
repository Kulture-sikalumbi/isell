"use client";

import type { DisplayCurrency } from "@/lib/display-currency-preference";

interface CurrencyPreferenceGateProps {
  initialCurrency: DisplayCurrency | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
}

/** Currency is auto-set to USD on first login — no blocking modal. Users change it from the menu. */
export function CurrencyPreferenceGate(_props: CurrencyPreferenceGateProps) {
  return null;
}
