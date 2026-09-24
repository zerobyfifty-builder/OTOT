import type { TransactionChargesSplit } from "@/types/otot";

const PLATFORM_RATE = 0.05;
const PROCESSOR_RATE = 0.029;

export function splitCharges(amount: number): TransactionChargesSplit {
  const platform = Math.round(amount * PLATFORM_RATE * 100) / 100;
  const processor = Math.round(amount * PROCESSOR_RATE * 100) / 100;
  const plantation = Math.round((amount - platform - processor) * 100) / 100;
  return { plantation, platform, processor };
}
