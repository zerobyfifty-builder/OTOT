import { Badge } from "@/components/ui/badge";
import {
  DONATION_PAYMENT_LABELS,
  DONATION_PAYMENT_TONES,
  OFFSET_LABELS,
  OFFSET_TONES,
  type DonationPaymentState,
} from "@/lib/offsetLabels";
import type { OffsetStatus } from "@/lib/trips";
import { cn } from "@/lib/utils";

export function OffsetBadge({ status, className }: { status: OffsetStatus; className?: string }) {
  return <Badge className={cn(OFFSET_TONES[status], "whitespace-nowrap", className)}>{OFFSET_LABELS[status]}</Badge>;
}

export function DonationPaymentBadge({ state, className }: { state: DonationPaymentState; className?: string }) {
  return (
    <Badge variant="outline" className={cn(DONATION_PAYMENT_TONES[state], "whitespace-nowrap", className)}>
      {DONATION_PAYMENT_LABELS[state]}
    </Badge>
  );
}
