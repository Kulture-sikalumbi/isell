"use client";

import { useEffect, useState } from "react";
import { CurrencyPickerModal } from "@/components/currency/currency-picker-modal";
import type { DisplayCurrency } from "@/lib/display-currency-preference";

interface CurrencyPreferenceGateProps {
  initialCurrency: DisplayCurrency | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
}

/** Blocks store UI until a logged-in customer picks Zambia (ZMW) or International (USD). */
export function CurrencyPreferenceGate({
  initialCurrency,
  isLoggedIn,
  isAdmin,
}: CurrencyPreferenceGateProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoggedIn && !isAdmin && !initialCurrency) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isLoggedIn, isAdmin, initialCurrency]);

  if (!isLoggedIn || isAdmin) return null;

  return (
    <CurrencyPickerModal
      open={open}
      required
      onSaved={() => setOpen(false)}
    />
  );
}
