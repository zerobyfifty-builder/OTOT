import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PRESET_LABELS, type DashboardPreset, type DashboardRange } from "./useDashboardDateRange";

const PRESETS: DashboardPreset[] = ["today", "7d", "30d", "90d", "quarter", "ytd", "all"];

export function GlobalDateRangeFilter({
  range,
  onPreset,
  onCustom,
}: {
  range: DashboardRange;
  onPreset: (p: DashboardPreset) => void;
  onCustom: (from: Date, to: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({ from: range.from, to: range.to });

  const label = `${PRESET_LABELS[range.preset]} · ${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12px] font-medium text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:bg-muted/60 transition-colors">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="tabular-nums">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 overflow-hidden">
        <div className="flex">
          <div className="flex flex-col border-r border-border bg-muted/30 p-2 min-w-[150px]">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  onPreset(p);
                  setOpen(false);
                }}
                className={cn(
                  "text-left text-[12px] px-3 py-1.5 rounded-md transition-colors",
                  range.preset === p ? "bg-primary text-primary-foreground font-medium" : "text-foreground hover:bg-muted",
                )}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <span className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Custom</span>
          </div>
          <div className="p-2 pointer-events-auto">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={draft}
              onSelect={(r) => {
                setDraft(r);
                if (r?.from && r?.to) {
                  onCustom(r.from, r.to);
                  setOpen(false);
                }
              }}
              initialFocus
              className="pointer-events-auto"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
