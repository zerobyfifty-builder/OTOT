import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";

export type DatePreset = "all" | "today" | "yesterday" | "7d" | "30d" | "this_month" | "last_month" | "custom";

export interface DateFilter {
  preset: DatePreset;
  /** Only used for `custom`; presets are resolved when filtering so "Today" stays current. */
  from?: Date;
  to?: Date;
}

export const ALL_TIME: DateFilter = { preset: "all" };

export const DATE_PRESETS: { value: Exclude<DatePreset, "custom">; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

export function resolveDateFilter(filter: DateFilter, now = new Date()): { from?: Date; to?: Date } {
  switch (filter.preset) {
    case "all":
      return {};
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const day = subDays(now, 1);
      return { from: startOfDay(day), to: endOfDay(day) };
    }
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "30d":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_month": {
      const month = subMonths(now, 1);
      return { from: startOfMonth(month), to: endOfMonth(month) };
    }
    case "custom":
      return {
        from: filter.from ? startOfDay(filter.from) : undefined,
        to: filter.to ? endOfDay(filter.to) : filter.from ? endOfDay(filter.from) : undefined,
      };
  }
}

/** Returns a predicate for ISO timestamps; resolve once per render, not per row. */
export function dateMatcher(filter: DateFilter): (iso: string) => boolean {
  const { from, to } = resolveDateFilter(filter);
  if (!from && !to) return () => true;
  return (iso) => {
    const date = new Date(iso);
    return (!from || date >= from) && (!to || date <= to);
  };
}

export function dateFilterLabel(filter: DateFilter): string {
  if (filter.preset !== "custom") return DATE_PRESETS.find((p) => p.value === filter.preset)!.label;
  const { from, to } = resolveDateFilter(filter);
  if (!from) return "Custom range";
  if (!to || format(from, "yyyy-MM-dd") === format(to, "yyyy-MM-dd")) return format(from, "d MMM yyyy");
  const sameYear = from.getFullYear() === to.getFullYear();
  return `${format(from, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
}
