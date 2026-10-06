import type { StoreSettings, TransactionChargesSplit } from "@/types/otot";

type FeeRates = Pick<StoreSettings, "chargeFeePct" | "payoutFeePct">;

/** Mirrors splitCharges in bakend/src/lib/charges.ts: every Afrinet fee first, then 15/15/70. */
export function splitCharges(amount: number, fees: FeeRates): TransactionChargesSplit {
  const grossCents = Math.round(amount * 100);
  const processorCents =
    Math.round((grossCents * fees.chargeFeePct) / 100) + Math.round((grossCents * fees.payoutFeePct) / 100);
  const netCents = grossCents - processorCents;
  const platformCents = Math.round(netCents * 0.15);
  const ministryCents = Math.round(netCents * 0.15);
  return {
    plantation: (netCents - platformCents - ministryCents) / 100,
    platform: platformCents / 100,
    ministry: ministryCents / 100,
    processor: processorCents / 100,
  };
}

/** Whole shillings the M-Pesa prompt or card checkout will ask for (bakend usdToWholeKes). */
export function usdToKes(usd: number, kesPerUsd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.max(1, Math.round(usd * kesPerUsd));
}
