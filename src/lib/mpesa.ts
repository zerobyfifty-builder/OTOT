export function looksLikeMpesaPhone(raw: string): boolean {
  const digits = raw.replace(/[^\d]/g, "");
  return (
    (digits.startsWith("254") && digits.length === 12) ||
    (digits.startsWith("0") && digits.length === 10) ||
    (digits.length === 9 && digits.startsWith("7"))
  );
}
