/**
 * Platform fee is a percentage of activation price — set per tool by admin.
 * Applied only on wallet activation checkout (not deposits).
 */

export interface PlatformFeeToolInput {
  retail_price: number;
  platform_fee_percent?: number | null;
}

function parsePercent(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
  return n;
}

/** Suggested default when creating a new tool in admin (env hint only — not used at checkout). */
export function getSuggestedPlatformFeePercent(): number {
  return parsePercent(
    process.env.PLATFORM_FEE_PERCENT?.trim() ??
      process.env.PLATFORM_FEE_RATE?.trim(),
    20
  );
}

/** @deprecated Use getSuggestedPlatformFeePercent — env is not used at checkout. */
export function getDefaultPlatformFeePercent(): number {
  return getSuggestedPlatformFeePercent();
}

/** Site-wide activation fee % — set via PLATFORM_FEE_PERCENT on Azure (not per-tool in admin). */
export function getToolPlatformFeePercent(_tool?: {
  platform_fee_percent?: number | null;
}): number {
  return getSuggestedPlatformFeePercent();
}

/** Fee amount in currency units, rounded to 2 decimal places. Activation purchase only. */
export function calculatePlatformFee(
  toolPrice: number,
  tool?: PlatformFeeToolInput | null
): number {
  const price = Number(toolPrice);
  if (!Number.isFinite(price) || price < 0) return 0;

  const percent = tool ? getToolPlatformFeePercent(tool) : 0;
  if (percent <= 0) return 0;

  const fee = (price * percent) / 100;
  return Math.round(fee * 100) / 100;
}

/** Total the customer pays at checkout (activation price — fee is not shown separately). */
export function getCheckoutTotal(tool: PlatformFeeToolInput): number {
  const price = Number(tool.retail_price);
  if (!Number.isFinite(price) || price < 0) return 0;
  return Math.round((price + calculatePlatformFee(price, tool)) * 100) / 100;
}

export function describePlatformFee(
  toolPrice: number,
  tool?: PlatformFeeToolInput | null
): { percent: number; amount: number } {
  const percent = tool ? getToolPlatformFeePercent(tool) : 0;
  return {
    percent,
    amount: calculatePlatformFee(toolPrice, tool ?? undefined),
  };
}

export function isValidPlatformFeePercent(value: unknown): value is number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100;
}
