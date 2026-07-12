"use client";

import { useState } from "react";
import { CurrencyPickerModal } from "@/components/currency/currency-picker-modal";
import type { DisplayCurrency } from "@/lib/display-currency-preference";

interface CurrencyPreferenceGateProps {
  initialCurrency: DisplayCurrency | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export function CurrencyPreferenceGate({
  initialCurrency,
  isLoggedIn,
  isAdmin,
}: CurrencyPreferenceGateProps) {
  const [currency, setCurrency] = useState(initialCurrency);
  const needsSelection = isLoggedIn && !isAdmin && !currency;

  return (
    <CurrencyPickerModal
      open={needsSelection}
      required
      onSaved={(c) => setCurrency(c)}
    />
  );
}
