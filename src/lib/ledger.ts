import type {
  AllocationStatus,
  Donation,
  PaymentAllocation,
  RecipientType,
  StoreState,
} from "@/types/otot";
import { isPayable, shareStatus } from "@/lib/payouts";

/** One recipient's share of a donation, combined across its successful payments. */
export interface DonationShare {
  amountKes: number;
  status: AllocationStatus | "unassigned";
  partnerId?: string;
  payable: boolean;
  payableKes: number;
  payoutIds: string[];
}

export interface DonationLedgerRow {
  donation: Donation;
  grossKes: number;
  /** Afrinet collection fee. */
  feeKes: number;
  /** Reserve for the M-Pesa B2C fees of paying the shares out. */
  payoutFeeKes: number;
  /**
   * When the money arrived: the shares are written the moment a payment
   * settles. Falls back to the donation date for donations without shares.
   */
  paidAt: string;
  shares: Partial<Record<RecipientType, DonationShare>>;
}

/**
 * Least-settled first, so a donation only reads "Transferred" once every part
 * is. `void` comes last: a share reads "Not payable" only when all of it is.
 */
const STATUS_ORDER: (AllocationStatus | "unassigned")[] = [
  "failed",
  "unassigned",
  "pending",
  "initiated",
  "in_progress",
  "transferred",
  "void",
];

function combine(rows: PaymentAllocation[]): DonationShare {
  const first = rows[0]!;
  const statuses = rows.map((a) => shareStatus(a)!);
  const payableRows = rows.filter(isPayable);
  return {
    amountKes: rows.reduce((s, a) => s + a.amountKes, 0),
    status: STATUS_ORDER.find((s) => statuses.includes(s)) ?? first.status,
    partnerId: first.partnerId,
    payable: payableRows.length > 0,
    payableKes: payableRows.reduce((s, a) => s + a.amountKes, 0),
    payoutIds: [...new Set(rows.map((a) => a.payoutId).filter((id): id is string => Boolean(id)))],
  };
}

/**
 * KES actually received per donation: settled payments, less duplicates
 * (that money belongs to the payer until it is refunded).
 */
export function receivedKesByDonation(state: StoreState): Map<string, number> {
  const totals = new Map<string, number>();
  for (const p of state.payments) {
    if (p.status !== "success" || p.issue === "duplicate") continue;
    totals.set(p.donationId, (totals.get(p.donationId) ?? 0) + (p.amountKes ?? 0));
  }
  return totals;
}

/** A partner's KES share per donation (void shares are never paid, so they don't count). */
export function partnerShareKesByDonation(state: StoreState, partnerId?: string): Map<string, number> {
  const totals = new Map<string, number>();
  for (const a of state.paymentAllocations) {
    if (a.recipientType !== "partner" || a.status === "void") continue;
    if (partnerId && a.partnerId !== partnerId) continue;
    totals.set(a.donationId, (totals.get(a.donationId) ?? 0) + a.amountKes);
  }
  return totals;
}

export function buildDonationLedger(state: StoreState): DonationLedgerRow[] {
  const byDonation = new Map<string, PaymentAllocation[]>();
  for (const a of state.paymentAllocations) {
    const list = byDonation.get(a.donationId) ?? [];
    list.push(a);
    byDonation.set(a.donationId, list);
  }
  const successByDonation = new Map<string, { grossKes: number; feeKes: number; payoutFeeKes: number }>();
  for (const p of state.payments) {
    if (p.status !== "success") continue;
    const current = successByDonation.get(p.donationId) ?? { grossKes: 0, feeKes: 0, payoutFeeKes: 0 };
    current.grossKes += p.amountKes ?? 0;
    current.feeKes += p.feeKes ?? 0;
    current.payoutFeeKes += p.payoutFeeKes ?? 0;
    successByDonation.set(p.donationId, current);
  }

  return [...state.donations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((donation) => {
      const allocations = byDonation.get(donation.id) ?? [];
      const shares: DonationLedgerRow["shares"] = {};
      for (const type of ["otot", "ministry", "partner"] as const) {
        const rows = allocations.filter((a) => a.recipientType === type);
        if (rows.length) shares[type] = combine(rows);
      }
      const money = successByDonation.get(donation.id) ?? { grossKes: 0, feeKes: 0, payoutFeeKes: 0 };
      // Older rows may predate paid_at; their first share was created at settlement.
      const paidAt =
        donation.paidAt ??
        allocations.reduce<string | undefined>(
          (earliest, a) => (!earliest || a.createdAt < earliest ? a.createdAt : earliest),
          undefined,
        );
      return { donation, ...money, paidAt: paidAt ?? donation.createdAt, shares };
    });
}
