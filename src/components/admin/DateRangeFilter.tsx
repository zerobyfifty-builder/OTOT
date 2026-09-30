import { useState } from "react";
import { subMonths } from "date-fns";
import { CalendarIcon, Check, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ALL_TIME, DATE_PRESETS, dateFilterLabel, type DateFilter, type DatePreset } from "@/lib/dateFilter";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DateRangeFilter({
  value,
  onChange,
  className,
}: {
  value: DateFilter;
  onChange: (next: DateFilter) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(value.preset === "custom");
  const [draft, setDraft] = useState<DateRange | undefined>(
    value.preset === "custom" ? { from: value.from, to: value.to } : undefined,
  );

  const handleOpen = (next: boolean) => {
    if (next) {
      setCustom(value.preset === "custom");
      setDraft(value.preset === "custom" ? { from: value.from, to: value.to } : undefined);
    }
    setOpen(next);
  };

  const pickPreset = (preset: Exclude<DatePreset, "custom">) => {
    onChange({ preset });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!draft?.from) return;
    onChange({ preset: "custom", from: draft.from, to: draft.to ?? draft.from });
    setOpen(false);
  };

  const active = value.preset !== "all";

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-10 w-full justify-start gap-2 font-normal",
              active ? "pr-9" : "text-muted-foreground",
            )}
            aria-label="Filter by date"
          >
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{dateFilterLabel(value)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" sideOffset={6}>
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-row flex-wrap gap-1 border-b p-2 sm:w-44 sm:flex-col sm:flex-nowrap sm:border-b-0 sm:border-r">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => pickPreset(preset.value)}
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                    value.preset === preset.value && !custom && "bg-primary/10 font-medium text-primary",
                  )}
                >
                  {preset.label}
                  {value.preset === preset.value && !custom && <Check className="h-4 w-4" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustom(true)}
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
                  custom && "bg-primary/10 font-medium text-primary",
                )}
              >
                Custom range…
              </button>
            </div>
            {custom && (
              <div className="flex flex-col">
                <Calendar
                  mode="range"
                  selected={draft}
                  onSelect={setDraft}
                  numberOfMonths={2}
                  defaultMonth={draft?.from ?? subMonths(new Date(), 1)}
                  disabled={{ after: new Date() }}
                  className="pointer-events-auto"
                />
                <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    {draft?.from
                      ? dateFilterLabel({ preset: "custom", from: draft.from, to: draft.to })
                      : "Pick a start and end date"}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" disabled={!draft?.from} onClick={applyCustom}>
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {active && (
        <button
          type="button"
          aria-label="Clear date filter"
          onClick={() => onChange(ALL_TIME)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
