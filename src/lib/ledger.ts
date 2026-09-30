import type {
  AllocationStatus,
  Donation,
  PaymentAllocation,
  RecipientType,
  StoreState,
} from "@/types/otot";
import { isPayable } from "@/lib/payouts";

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
  feeKes: number;
  shares: Partial<Record<RecipientType, DonationShare>>;
}

/** Least-settled first, so a donation only reads "Transferred" once every part is. */
const STATUS_ORDER: (AllocationStatus | "unassigned")[] = [
  "failed",
  "unassigned",
  "pending",
  "initiated",
  "in_progress",
  "transferred",
];

function combine(rows: PaymentAllocation[]): DonationShare {
  const first = rows[0]!;
  const statuses = rows.map((a) =>
    a.recipientType === "partner" && !a.partnerId ? ("unassigned" as const) : a.status,
  );
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

export function buildDonationLedger(state: StoreState): DonationLedgerRow[] {
  const byDonation = new Map<string, PaymentAllocation[]>();
  for (const a of state.paymentAllocations) {
    const list = byDonation.get(a.donationId) ?? [];
    list.push(a);
    byDonation.set(a.donationId, list);
  }
  const successByDonation = new Map<string, { grossKes: number; feeKes: number }>();
  for (const p of state.payments) {
    if (p.status !== "success") continue;
    const current = successByDonation.get(p.donationId) ?? { grossKes: 0, feeKes: 0 };
    current.grossKes += p.amountKes ?? 0;
    current.feeKes += p.feeKes ?? 0;
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
      const money = successByDonation.get(donation.id) ?? { grossKes: 0, feeKes: 0 };
      return { donation, ...money, shares };
    });
}
