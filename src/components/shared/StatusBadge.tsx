import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  success: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  pending_payment: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-amber-100 text-amber-800 border-amber-200",
  assigned: "bg-sky-100 text-sky-800 border-sky-200",
  in_progress: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ready_for_review: "bg-violet-100 text-violet-800 border-violet-200",
  unassigned: "bg-stone-100 text-stone-700 border-stone-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-red-100 text-red-800 border-red-200",
  inactive: "bg-stone-100 text-stone-600 border-stone-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <Badge variant="outline" className={cn("capitalize", TONES[status] || "bg-muted")}>
      {label}
    </Badge>
  );
}
