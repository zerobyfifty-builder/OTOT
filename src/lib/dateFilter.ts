import { format } from "date-fns";

export type DatePreset = "all" | "today" | "yesterday" | "7d" | "30d" | "this_month" | "last_month" | "custom";

export interface DateFilter {
  preset: DatePreset;
  /**
   * Only used for `custom`: the calendar days picked (local midnight). They
   * are read as Nairobi days, so a range means the same thing for every viewer.
   */
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

/** Kenya (Africa/Nairobi) is UTC+3 all year, with no daylight saving. */
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

interface Day {
  year: number;
  month: number;
  day: number;
}

/** The Nairobi calendar day an instant falls on. */
function nairobiDay(instant: Date): Day {
  const shifted = new Date(instant.getTime() + EAT_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

/** First instant of a Nairobi day; out-of-range days and months roll over like Date.UTC. */
const nairobiStart = ({ year, month, day }: Day) => new Date(Date.UTC(year, month, day) - EAT_OFFSET_MS);
/** Last instant of a Nairobi day. */
const nairobiEnd = ({ year, month, day }: Day) => new Date(Date.UTC(year, month, day + 1) - EAT_OFFSET_MS - 1);

/** A day picked on the calendar (local midnight), read as that Nairobi day. */
const pickedDay = (date: Date): Day => ({ year: date.getFullYear(), month: date.getMonth(), day: date.getDate() });

/** Preset boundaries are Nairobi days, whatever the viewer's own time zone. */
export function resolveDateFilter(filter: DateFilter, now = new Date()): { from?: Date; to?: Date } {
  const today = nairobiDay(now);
  const offset = (days: number): Day => ({ ...today, day: today.day + days });
  switch (filter.preset) {
    case "all":
      return {};
    case "today":
      return { from: nairobiStart(today), to: nairobiEnd(today) };
    case "yesterday":
      return { from: nairobiStart(offset(-1)), to: nairobiEnd(offset(-1)) };
    case "7d":
      return { from: nairobiStart(offset(-6)), to: nairobiEnd(today) };
    case "30d":
      return { from: nairobiStart(offset(-29)), to: nairobiEnd(today) };
    case "this_month":
      return { from: nairobiStart({ ...today, day: 1 }), to: nairobiEnd(today) };
    case "last_month":
      return {
        from: nairobiStart({ ...today, month: today.month - 1, day: 1 }),
        // Day 0 of this month is the last day of the previous one.
        to: nairobiEnd({ ...today, day: 0 }),
      };
    case "custom": {
      const end = filter.to ?? filter.from;
      return {
        from: filter.from ? nairobiStart(pickedDay(filter.from)) : undefined,
        to: end ? nairobiEnd(pickedDay(end)) : undefined,
      };
    }
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
  // Label the picked calendar days themselves, not the Nairobi instants they resolve to.
  const { from, to } = filter;
  if (!from) return "Custom range";
  if (!to || format(from, "yyyy-MM-dd") === format(to, "yyyy-MM-dd")) return format(from, "d MMM yyyy");
  const sameYear = from.getFullYear() === to.getFullYear();
  return `${format(from, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
}
