import type { TransactionChargesSplit } from "@/types/otot";

const PROCESSOR_RATE = 0.029;

export function splitCharges(amount: number): TransactionChargesSplit {
  const grossCents = Math.round(amount * 100);
  const processorCents = Math.round(grossCents * PROCESSOR_RATE);
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
