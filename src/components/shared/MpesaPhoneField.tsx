import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MpesaPhoneFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
};

export function MpesaPhoneField({
  id = "mpesa-phone",
  value,
  onChange,
  disabled,
  hint = "Safaricom will send a payment prompt to this number.",
}: MpesaPhoneFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>M-Pesa number</Label>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="07XX XXX XXX"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
