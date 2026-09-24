import type { PayoutStatus, PlantationRequestStatus, VendorRequestStatus } from "@/types/otot";

export const C = {
  green: "#3B6D11",
  teal: "#1D9E75",
  amber: "#BA7517",
  red: "#A32D2D",
  muted: "#6B7280",
  border: "#E5E7EB",
  barFill: "#639922",
  greenBg: "#EAF3DE",
  tealBg: "#E1F5EE",
  amberBg: "#FAEEDA",
};

export const KPI_TINTS = [
  { bg: "bg-[#E3E7FB] dark:bg-[#2A2E47]", fg: "text-[#3B4A8C] dark:text-[#C7CEF5]" },
  { bg: "bg-[#E5F0FF] dark:bg-[#1F2A3D]", fg: "text-[#1E5BB8] dark:text-[#9EC5FF]" },
  { bg: "bg-[#EFE6FF] dark:bg-[#2D2342]", fg: "text-[#6B3FB8] dark:text-[#D4BFFF]" },
  { bg: "bg-[#D7F0E5] dark:bg-[#1E332A]", fg: "text-[#1D7A52] dark:text-[#9EE3C0]" },
];

export const SPECIES_COLORS = [C.green, C.teal, C.amber, "#D4537E", "#378ADD", "#7F77DD", "#EF9F27", "#5DCAA5"];

export const BADGE_BASE = "whitespace-nowrap px-2 py-0.5 text-[10px] font-medium";

export const TABLE_HEAD = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export const REQUEST_STATUS_ORDER: PlantationRequestStatus[] = [
  "unassigned",
  "assigned",
  "in_progress",
  "ready_for_review",
  "completed",
];

export const REQUEST_STATUS_LABELS: Record<PlantationRequestStatus, string> = {
  unassigned: "Waiting to be assigned",
  assigned: "Assigned",
  in_progress: "In progress",
  ready_for_review: "Ready for review",
  completed: "Completed",
};

export const REQUEST_STATUS_COLORS: Record<PlantationRequestStatus, string> = {
  unassigned: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  assigned: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  in_progress: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  ready_for_review: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  completed: "bg-green-500/10 text-green-700 border-green-500/20",
};

export const REQUEST_STATUS_BAR: Record<PlantationRequestStatus, string> = {
  unassigned: "#888780",
  assigned: "#378ADD",
  in_progress: "#1D9E75",
  ready_for_review: "#7F77DD",
  completed: "#639922",
};

export const VENDOR_STATUS_ORDER: VendorRequestStatus[] = ["assigned", "in_progress", "completed"];

export const VENDOR_STATUS_LABELS: Record<VendorRequestStatus, string> = {
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
};

export const VENDOR_STATUS_COLORS: Record<VendorRequestStatus, string> = {
  assigned: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  in_progress: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  completed: "bg-green-500/10 text-green-700 border-green-500/20",
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  paid: "Paid",
  failed: "Failed",
};

export const PAYOUT_STATUS_COLORS: Record<PayoutStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  processing: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
  failed: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
};

export const PAGE_SIZE = 15;

export const fmtNum = (n: number) => new Intl.NumberFormat("en-US").format(n);

export const shortRef = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();
