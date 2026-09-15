import { format } from "date-fns";

export function usd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export const kes = (amount: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);

export const kg = (value: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)} kg`;

export const shortDate = (iso: string) => format(new Date(iso), "d MMM yyyy");

export const treeCount = (trees: { count: number }[]) =>
  trees.reduce((sum, row) => sum + row.count, 0);
