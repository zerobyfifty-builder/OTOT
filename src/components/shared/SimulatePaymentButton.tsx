import { Button } from "@/components/ui/button";
import { useSimulationAllowed } from "@/hooks/useSimulationAllowed";

type SimulatePaymentButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
};

export function SimulatePaymentButton({ onClick, disabled, busy, className }: SimulatePaymentButtonProps) {
  const allowed = useSimulationAllowed();
  if (!allowed) return null;

  return (
    <Button type="button" variant="outline" className={className} disabled={disabled || busy} onClick={onClick}>
      {busy ? "Marking payment as done…" : "Mark this payment as done"}
    </Button>
  );
}
