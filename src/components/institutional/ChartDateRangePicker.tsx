import { useState, useCallback } from "react";
import { format, subDays, subMonths, startOfDay, endOfDay, startOfMonth, startOfYear } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ChartDateRangePickerProps {
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

const presets = [
  { label: "Today", getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Last 3 Days", getValue: () => ({ from: startOfDay(subDays(new Date(), 2)), to: endOfDay(new Date()) }) },
  { label: "Last 7 Days", getValue: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: "Last 30 Days", getValue: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: "Last 3 Months", getValue: () => ({ from: startOfDay(subMonths(new Date(), 3)), to: endOfDay(new Date()) }) },
  { label: "Last 6 Months", getValue: () => ({ from: startOfDay(subMonths(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: "Last 1 Year", getValue: () => ({ from: startOfDay(subMonths(new Date(), 12)), to: endOfDay(new Date()) }) },
];

export function ChartDateRangePicker({ dateRange, onDateRangeChange }: ChartDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  // Internal draft state so Apply/Cancel work
  const [draft, setDraft] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  const hasRange = dateRange.from || dateRange.to;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDraft({ from: dateRange.from, to: dateRange.to });
      setIsCustom(!!(dateRange.from && !activePreset));
    }
    setOpen(isOpen);
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    setDraft(range);
    setActivePreset(preset.label);
    setIsCustom(false);
  };

  const handleCustomClick = () => {
    setActivePreset(null);
    setIsCustom(true);
  };

  const handleApply = () => {
    onDateRangeChange(draft);
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleClear = () => {
    setDraft({ from: undefined, to: undefined });
    setActivePreset(null);
    onDateRangeChange({ from: undefined, to: undefined });
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 text-xs justify-start font-normal gap-1.5",
              !hasRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "d MMM yyyy")} – {format(dateRange.to, "d MMM yyyy")}
                </>
              ) : (
                format(dateRange.from, "d MMM yyyy")
              )
            ) : (
              "Select date range"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
          <div className="flex flex-col">
            {/* Top bar: selected range display + actions */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium border rounded-md px-3 py-1.5 bg-muted/50">
                  {draft.from ? format(draft.from, "d MMMM yyyy") : "Start date"}
                  <span className="mx-2 text-muted-foreground">–</span>
                  {draft.to ? format(draft.to, "d MMMM yyyy") : "End date"}
                </span>
                {(draft.from || draft.to) && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button variant="ghost" size="sm" onClick={handleCancel} className="text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleApply} className="text-xs">
                  Apply
                </Button>
              </div>
            </div>

            {/* Body: presets sidebar + calendars */}
            <div className="flex">
              {/* Presets sidebar */}
              <div className="border-r w-40 py-2">
                <button
                  onClick={handleCustomClick}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2",
                    isCustom && "text-primary font-semibold"
                  )}
                >
                  Customised
                  {isCustom && <span className="text-xs">»</span>}
                </button>
                <div className="border-t my-1" />
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors",
                      activePreset === preset.label && "text-primary font-semibold bg-primary/5"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Dual calendars */}
              <div className="flex gap-0">
                <div className="p-3">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">From</p>
                  <Calendar
                    mode="range"
                    selected={{ from: draft.from, to: draft.to }}
                    onSelect={(range) => {
                      setDraft({ from: range?.from, to: range?.to });
                      setActivePreset(null);
                      setIsCustom(true);
                    }}
                    numberOfMonths={1}
                    className={cn("pointer-events-auto")}
                    defaultMonth={draft.from || subMonths(new Date(), 1)}
                  />
                </div>
                <div className="p-3 border-l">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">To</p>
                  <Calendar
                    mode="range"
                    selected={{ from: draft.from, to: draft.to }}
                    onSelect={(range) => {
                      setDraft({ from: range?.from, to: range?.to });
                      setActivePreset(null);
                      setIsCustom(true);
                    }}
                    numberOfMonths={1}
                    className={cn("pointer-events-auto")}
                    defaultMonth={draft.to || new Date()}
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {hasRange && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            onDateRangeChange({ from: undefined, to: undefined });
            setActivePreset(null);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
