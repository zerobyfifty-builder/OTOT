import { looksLikeMpesaPhone } from "@/lib/mpesa";
import type { CheckoutMethod, PaymentMode } from "@/types/otot";

export type CheckoutResult = {
  donation: { id: string };
  payment: { id: string };
  checkoutUrl: string;
};

export function redirectToCheckout(url: string, navigate: (path: string) => void) {
  const abs = new URL(url, window.location.origin);
  if (abs.origin !== window.location.origin) {
    window.location.assign(abs.toString());
    return;
  }
  navigate(`${abs.pathname}${abs.search}${abs.hash}`);
}

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
