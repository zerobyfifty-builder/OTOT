import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, Leaf } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { offsetStatus, offsetTripState, pendingDonationsForTrip } from "@/lib/trips";
import { cn } from "@/lib/utils";
import type { Donation, Payment, Trip } from "@/types/otot";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function latestPending(trip: Trip, donations: Donation[], payments: Payment[]) {
  return pendingDonationsForTrip(trip.id, donations, payments)
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
}

/** "Payment pending" link to the trip's open donation, or nothing. */
export function PendingPaymentLink({ trip, className }: { trip: Trip; className?: string }) {
  const { state } = useStore();
  const pending = latestPending(trip, state.donations, state.payments);
  if (!pending) return null;
  return (
    <Link
      to={`/donations/${pending.id}`}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-amber-700 underline-offset-4 hover:underline",
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      Payment pending
    </Link>
  );
}

/**
 * Sends a trip to Donate for its remaining CO₂. Hidden once the trip is fully
 * offset; asks first when a payment for the trip is still open.
 */
export function OffsetTripButton({
  trip,
  label = "Offset",
  size = "sm",
  className,
  showIcon = true,
}: {
  trip: Trip;
  label?: string;
  size?: ButtonProps["size"];
  className?: string;
  showIcon?: boolean;
}) {
  const navigate = useNavigate();
  const { state } = useStore();
  const [confirming, setConfirming] = useState(false);
  if (offsetStatus(trip, state.donations) === "fully") return null;

  const pending = latestPending(trip, state.donations, state.payments);
  const go = () => navigate("/donate", { state: offsetTripState(trip, state.donations) });

  return (
    <>
      <Button size={size} className={className} onClick={() => (pending ? setConfirming(true) : go())}>
        {showIcon && <Leaf className="h-3 w-3 mr-1" aria-hidden />}
        {label}
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>A payment for this trip is still open</AlertDialogTitle>
            <AlertDialogDescription>
              If you already approved the M-Pesa prompt or paid by card, wait for it to confirm. Starting another
              payment now could charge you twice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {pending && (
              <Button variant="outline" asChild>
                <Link to={`/donations/${pending.id}`}>View pending payment</Link>
              </Button>
            )}
            <AlertDialogAction onClick={go}>Start a new payment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
