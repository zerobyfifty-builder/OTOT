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
