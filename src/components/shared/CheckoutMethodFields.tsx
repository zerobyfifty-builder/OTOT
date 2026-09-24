import { MpesaPhoneField } from "@/components/shared/MpesaPhoneField";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { looksLikeMpesaPhone } from "@/lib/mpesa";
import type { CheckoutMethod, PaymentMode } from "@/types/otot";

export function checkoutMethodFromMode(mode?: PaymentMode): CheckoutMethod {
  return mode === "Card" ? "card" : "mpesa";
}

export function checkoutReady(method: CheckoutMethod, phoneNumber: string): boolean {
  return method === "card" || looksLikeMpesaPhone(phoneNumber);
}

export function checkoutActionLabel(
  method: CheckoutMethod,
  options?: { busy?: boolean; retry?: boolean },
): string {
  if (method === "card") {
    if (options?.busy) return "Opening card checkout…";
    return options?.retry ? "Try card checkout" : "Continue to card checkout";
  }
  if (options?.busy) return "Sending M-Pesa prompt…";
  return options?.retry ? "Try M-Pesa again" : "Pay with M-Pesa";
}

type CheckoutMethodFieldsProps = {
  method: CheckoutMethod;
  onMethodChange: (method: CheckoutMethod) => void;
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  disabled?: boolean;
  phoneId?: string;
};

export function CheckoutMethodFields({
  method,
  onMethodChange,
  phoneNumber,
  onPhoneNumberChange,
  disabled,
  phoneId,
}: CheckoutMethodFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Payment method</Label>
        <ToggleGroup
          type="single"
          value={method}
          onValueChange={(value) => {
            if (value === "mpesa" || value === "card") onMethodChange(value);
          }}
          variant="outline"
          disabled={disabled}
          className="grid w-full grid-cols-2"
        >
          <ToggleGroupItem value="mpesa" className="w-full">
            M-Pesa
          </ToggleGroupItem>
          <ToggleGroupItem value="card" className="w-full">
            Card
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {method === "mpesa" ? (
        <MpesaPhoneField id={phoneId} value={phoneNumber} onChange={onPhoneNumberChange} disabled={disabled} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Card details stay on Afrinet's checkout page. We'll bring you back here after you pay or cancel.
        </p>
      )}
    </div>
  );
}
