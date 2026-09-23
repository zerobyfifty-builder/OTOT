import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { differenceInDays, format } from "date-fns";
import {
  ArrowRight,
  Calendar as CalIcon,
  CalendarIcon,
  Check,
  Cloud,
  Hotel,
  Leaf,
  MapPin,
  Minus,
  Plane,
  Plus,
  TreePine,
  Users,
  Wind,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { airports } from "@/data/airports";
import { EMISSION_FACTORS, getFlightEmissions } from "@/utils/emissionCalculatorApi";
import { useStore } from "@/contexts/StoreContext";
import { suggestTreeMix } from "@/lib/treeMix";
import { apiErrorMessage } from "@/lib/api";
import { treeCount, usd } from "@/lib/format";
import { ACCOMMODATION_LABELS } from "@/lib/trips";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import ktbLogo from "@/assets/ktb-logo.png";

// Trips need airport codes; flight-time entries keep the previous default route.
const FLIGHT_TIME_ORIGIN = "LHR";
const FLIGHT_TIME_DESTINATION = "NBO";

const flightSchema = z.object({
  originAirport: z.string(),
  destinationAirport: z.string(),
});

const formSchema = z
  .object({
    tripType: z.enum(["return", "oneway", "multicity"]),
    inputMode: z.enum(["airports", "flighttime"]),
    travelClass: z.enum(["economy", "premium_economy", "business", "first"]),
    flights: z.array(flightSchema).optional(),
    flightHours: z.number().min(0.5).max(20),
    fromDate: z.date({ required_error: "Please select your travel dates" }),
    toDate: z.date().optional(),
    accommodationType: z.enum(["none", "hotel", "rental", "cruise", "service_apartment"]),
    numTravelers: z.number().min(1).max(20),
  })
  .superRefine((data, ctx) => {
    if (data.inputMode !== "airports") return;
    (data.flights ?? []).forEach((flight, index) => {
      if (!flight.originAirport) {
        ctx.addIssue({ code: "custom", message: "Please select departure airport", path: ["flights", index, "originAirport"] });
      }
      if (!flight.destinationAirport) {
        ctx.addIssue({ code: "custom", message: "Please select arrival airport", path: ["flights", index, "destinationAirport"] });
      }
    });
  });

type FormData = z.infer<typeof formSchema>;

interface CalculationResult {
  distance: number;
  flightCO2: number;
  accommodationCO2: number;
  totalCO2: number;
  nights: number;
}

const TRAVEL_CLASS_LABELS = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
};

export default function CarbonCalculator() {
  const navigate = useNavigate();
  const { state, createTrip } = useStore();
  const isMobile = useIsMobile();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tripType: "return",
      inputMode: "airports",
      travelClass: "economy",
      flights: [{ originAirport: "", destinationAirport: "" }],
      flightHours: 5,
      numTravelers: 1,
      accommodationType: "none",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "flights" });

  useEffect(() => {
    const sub = form.watch(() => setCalculation(null));
    return () => sub.unsubscribe();
  }, [form]);

  const mix = useMemo(
    () => (calculation ? suggestTreeMix(calculation.totalCO2, state.treeTypes) : null),
    [calculation, state.treeTypes],
  );

  const onCalculate = async (data: FormData) => {
    setIsCalculating(true);
    try {
      const isReturn = data.tripType === "return";
      const flight =
        data.inputMode === "airports" && data.flights
          ? await getFlightEmissions({
              cabinClass: data.travelClass,
              numTravelers: data.numTravelers,
              isReturn,
              legs: data.flights.map((f) => ({ origin: f.originAirport, destination: f.destinationAirport })),
            })
          : await getFlightEmissions({
              cabinClass: data.travelClass,
              numTravelers: data.numTravelers,
              isReturn,
              distanceKm: data.flightHours * 850,
            });
      const nights = data.toDate ? Math.max(1, differenceInDays(data.toDate, data.fromDate)) : 0;
      const accommodationCO2 = EMISSION_FACTORS.accommodation[data.accommodationType] * nights * data.numTravelers;
      const result = {
        distance: flight.distance,
        flightCO2: flight.flightCO2,
        accommodationCO2,
        totalCO2: flight.flightCO2 + accommodationCO2,
        nights,
      };
      setTimeout(() => {
        setCalculation(result);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }, 0);
    } catch {
      toast.error("Failed to calculate emissions. Please check your inputs.");
    } finally {
      setIsCalculating(false);
    }
  };

  const saveTrip = async (thenPlant: boolean) => {
    if (!calculation || !mix) return;
    setIsSaving(true);
    try {
      const data = form.getValues();
      const legs = data.inputMode === "airports" ? data.flights ?? [] : [];
      const trip = await createTrip({
        originAirport: legs[0]?.originAirport || FLIGHT_TIME_ORIGIN,
        destinationAirport: legs[legs.length - 1]?.destinationAirport || FLIGHT_TIME_DESTINATION,
        travelClass: data.travelClass,
        isReturn: data.tripType === "return",
        fromDate: format(data.fromDate, "yyyy-MM-dd"),
        toDate: format(data.toDate ?? data.fromDate, "yyyy-MM-dd"),
        accommodationType: data.accommodationType,
        numTravelers: data.numTravelers,
        flightCo2: calculation.flightCO2,
        accommodationCo2: calculation.accommodationCO2,
        totalCo2: calculation.totalCO2,
        treesNeeded: treeCount(mix.trees),
        distanceKm: calculation.distance || undefined,
      });
      toast.success("Trip saved");
      if (thenPlant) {
        navigate("/donate", {
          state: {
            carbonOffsetKg: calculation.totalCO2,
            trees: mix.trees,
            treesNeeded: treeCount(mix.trees),
            tripId: trip.id,
          },
        });
      } else {
        navigate("/my-trips");
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const tripType = form.watch("tripType");
  const inputMode = form.watch("inputMode");
  const fromDate = form.watch("fromDate");
  const toDate = form.watch("toDate");
  const dateError = form.formState.errors.fromDate?.message;

  const clearDates = () => {
    form.setValue("fromDate", undefined as unknown as Date);
    form.setValue("toDate", undefined);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-8 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Carbon Calculator</h1>
            <p className="text-muted-foreground">Calculate your travel's carbon footprint and offset it with trees</p>
          </div>
          <img src={ktbLogo} alt="Kenya Tourism Board" className="hidden h-20 object-contain md:block" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-6">
            <div className="flex flex-col-reverse items-stretch gap-4 md:flex-row md:items-center md:justify-between md:gap-0">
              <FormField
                control={form.control}
                name="tripType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="return" id="return" className="border-primary text-primary" />
                          <Label htmlFor="return" className="cursor-pointer">Return</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="oneway" id="oneway" className="border-primary text-primary" />
                          <Label htmlFor="oneway" className="cursor-pointer">One way</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="multicity" id="multicity" className="border-primary text-primary" />
                          <Label htmlFor="multicity" className="cursor-pointer">Multi-city</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inputMode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex justify-start gap-0 border-b-2 border-border md:justify-end">
                        {(
                          [
                            ["airports", "Airports"],
                            ["flighttime", "Flight Time"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={cn(
                              "px-6 py-2 text-base font-semibold transition-colors border-b-2 -mb-0.5",
                              field.value === value
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {inputMode === "airports" && (
              <div className="space-y-4">
                {fields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <FormField
                      control={form.control}
                      name={`flights.${index}.originAirport`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-foreground">
                            <MapPin className="h-4 w-4" />
                            Trip From
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Departure Airport" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px]">
                              {airports.map((airport) => (
                                <SelectItem key={airport.code} value={airport.code}>
                                  {airport.city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`flights.${index}.destinationAirport`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="flex items-center gap-2 text-foreground">
                              <MapPin className="h-4 w-4" />
                              Trip To
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Destination Airport" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {airports.map((airport) => (
                                  <SelectItem key={airport.code} value={airport.code}>
                                    {airport.city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {tripType === "multicity" && index > 0 && (
                        <Button type="button" variant="ghost" size="icon" className="mt-8" onClick={() => remove(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {tripType === "multicity" && (
                  <Button
                    type="button"
                    variant="link"
                    className="text-foreground"
                    onClick={() => append({ originAirport: "", destinationAirport: "" })}
                  >
                    Add Flight
                  </Button>
                )}
              </div>
            )}

            {inputMode === "flighttime" && (
              <FormField
                control={form.control}
                name="flightHours"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-4">
                      <FormLabel>Flight Time (Hours one way)</FormLabel>
                      <span className="text-lg font-semibold">{field.value} Hrs</span>
                    </div>
                    <FormControl>
                      <div className="space-y-2">
                        <Slider
                          min={0.5}
                          max={20}
                          step={0.5}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="[&_[role=slider]]:bg-background [&_[role=slider]]:border-foreground [&_[role=slider]]:border-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Domestic</span>
                          <span>Medium-haul</span>
                          <span>Long-haul</span>
                          <span>Ultra long-haul</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="numTravelers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-foreground">
                        <Users className="h-4 w-4" />
                        Number of Travelers
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="icon"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 w-20"
                          onClick={() => field.onChange(Math.max(1, field.value - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 w-20"
                          onClick={() => field.onChange(Math.min(20, field.value + 1))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accommodationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-foreground">
                        <Hotel className="h-4 w-4" />
                        Accommodation Type
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select accommodation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(ACCOMMODATION_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="travelClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-foreground">
                        <Plane className="h-4 w-4" />
                        Travelled by
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(TRAVEL_CLASS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-foreground">
                    <CalIcon className="h-4 w-4" />
                    Dates/Days
                  </FormLabel>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate && toDate ? (
                          <>
                            {format(fromDate, "EEE dd MMM")} - {format(toDate, "EEE dd MMM")} (
                            {differenceInDays(toDate, fromDate)} days)
                            <X
                              className="ml-auto h-4 w-4"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearDates();
                              }}
                            />
                          </>
                        ) : fromDate ? (
                          <span>{format(fromDate, "EEE dd MMM")}</span>
                        ) : (
                          <span>Select date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
                      {isMobile ? (
                        <div className="p-4 w-[min(360px,calc(100vw-2rem))]">
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="rounded-lg border bg-background px-3 py-2">
                              <p className="text-xs text-muted-foreground mb-0.5">From (Onward)</p>
                              <p className="text-sm font-medium text-foreground">{fromDate ? format(fromDate, "MMM d") : "—"}</p>
                            </div>
                            <div className="rounded-lg border bg-background px-3 py-2">
                              <p className="text-xs text-muted-foreground mb-0.5">To (Return)</p>
                              <p className="text-sm font-medium text-foreground">{toDate ? format(toDate, "MMM d") : "—"}</p>
                            </div>
                          </div>
                          <Calendar
                            mode="range"
                            selected={{ from: fromDate, to: toDate }}
                            onSelect={(range) => {
                              form.setValue("fromDate", (range?.from as Date) ?? (undefined as unknown as Date), {
                                shouldValidate: Boolean(range?.from),
                              });
                              form.setValue("toDate", range?.to);
                              if (tripType === "oneway" && range?.from && !range?.to) {
                                form.setValue("toDate", range.from);
                              }
                            }}
                            numberOfMonths={1}
                            initialFocus
                            className="pointer-events-auto p-0"
                          />
                          <div className="flex items-center justify-end border-t pt-3 mt-3 gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={clearDates}>
                              Clear
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => setDatePickerOpen(false)}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium mb-2 text-center">From Date</p>
                              <Calendar
                                mode="single"
                                selected={fromDate}
                                onSelect={(date) => {
                                  form.setValue("fromDate", date as Date, { shouldValidate: Boolean(date) });
                                  if (tripType === "oneway" && !toDate) form.setValue("toDate", date);
                                }}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-2 text-center">To Date</p>
                              <Calendar
                                mode="single"
                                selected={toDate}
                                onSelect={(date) => form.setValue("toDate", date)}
                                disabled={(date) => (fromDate ? date < fromDate : false)}
                                className="pointer-events-auto"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end border-t pt-3 mt-3">
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={clearDates}>
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="bg-primary hover:bg-primary/90"
                                onClick={() => setDatePickerOpen(false)}
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  {dateError && <p className="text-sm font-medium text-destructive">{dateError}</p>}
                </FormItem>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isCalculating || !!calculation}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 text-lg disabled:opacity-100 disabled:bg-muted disabled:text-muted-foreground"
              >
                {isCalculating ? (
                  "Calculating..."
                ) : calculation ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    CO2 Calculated
                  </>
                ) : (
                  "Calculate My Footprint"
                )}
              </Button>
            </div>
          </form>
        </Form>

        {calculation &&
          mix &&
          (() => {
            const treesNeeded = treeCount(mix.trees);
            const visibleTrees = Math.min(treesNeeded, 12);
            return (
              <div ref={resultsRef} className="mt-8 animate-fade-in scroll-mt-0">
                <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl">
                  <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
                    <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-accent blur-3xl" />
                  </div>

                  <div className="relative p-4 sm:p-6">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Carbon Footprint</h2>
                        <p className="text-sm text-muted-foreground">Turn your travel into climate action!</p>
                      </div>
                      <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 animate-scale-in">
                        <Cloud className="h-7 w-7 text-primary" />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 mb-3">
                      <div className="group flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3 transition-all hover:border-primary/40 hover:shadow-md">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                          <Plane className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            Flight · {Math.round(calculation.distance).toLocaleString()} km
                          </p>
                          <p className="text-base font-semibold tabular-nums">
                            {calculation.flightCO2.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg CO₂</span>
                          </p>
                        </div>
                      </div>

                      {calculation.accommodationCO2 > 0 && (
                        <div className="group flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3 transition-all hover:border-primary/40 hover:shadow-md">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                            <Hotel className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">
                              {ACCOMMODATION_LABELS[form.getValues("accommodationType")]} · {calculation.nights} nights
                            </p>
                            <p className="text-base font-semibold tabular-nums">
                              {calculation.accommodationCO2.toFixed(1)}{" "}
                              <span className="text-xs font-normal text-muted-foreground">kg CO₂</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-4 sm:p-6 text-primary-foreground shadow-xl">
                      <Wind className="absolute top-4 right-6 h-5 w-5 opacity-30 animate-fade-in" />
                      <Cloud className="absolute top-10 right-16 h-4 w-4 opacity-20" style={{ animation: "fade-in 1s ease-out 0.3s both" }} />

                      <div className="grid gap-4 sm:grid-cols-2 items-center">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] font-medium opacity-80">Total trip emissions</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">
                              {calculation.totalCO2.toFixed(1)}
                            </span>
                            <span className="text-sm opacity-90">kg CO₂</span>
                          </div>
                          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs">
                            <Leaf className="h-3.5 w-3.5" />
                            Offset with native trees
                          </div>
                        </div>

                        <div className="relative">
                          <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/20">
                            <p className="text-[11px] uppercase tracking-[0.18em] opacity-80">Trees to plant</p>
                            <div className="mt-1 flex items-baseline gap-2">
                              <span className="text-5xl sm:text-6xl font-bold tabular-nums">{treesNeeded}</span>
                              <TreePine className="h-7 w-7 text-emerald-300" strokeWidth={2.5} fill="#10b981" fillOpacity={0.55} />
                            </div>
                            <style>{`
                              @keyframes tree-grow-loop {
                                0% { transform: scale(0) translateY(4px); opacity: 0; }
                                15% { transform: scale(1.08) translateY(0); opacity: 1; }
                                22% { transform: scale(1) translateY(0); opacity: 1; }
                                85% { transform: scale(1) translateY(0); opacity: 1; }
                                100% { transform: scale(0) translateY(4px); opacity: 0; }
                              }
                            `}</style>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {Array.from({ length: visibleTrees }).map((_, i) => (
                                <TreePine
                                  key={i}
                                  className="h-5 w-5 text-emerald-300"
                                  strokeWidth={2.5}
                                  fill="#10b981"
                                  fillOpacity={0.55}
                                  style={{
                                    animation: `tree-grow-loop ${Math.max(4, visibleTrees * 0.25 + 2.5)}s ease-in-out ${i * 0.18}s infinite both`,
                                    transformOrigin: "bottom center",
                                  }}
                                />
                              ))}
                              {treesNeeded > visibleTrees && (
                                <span className="ml-1 self-center text-xs font-medium opacity-90">
                                  +{treesNeeded - visibleTrees} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {mix.trees.length > 0 && (
                        <p className="mt-3 text-[11px] sm:text-xs opacity-85 border-t border-white/15 pt-2">
                          Suggested mix: {mix.trees.map((t) => `${t.count} × ${t.treeType}`).join(" · ")} · {usd(mix.amount)}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-row gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl border-2"
                        onClick={() => void saveTrip(false)}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save Trip"}
                      </Button>
                      <Button
                        className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover-scale group"
                        onClick={() => void saveTrip(true)}
                        disabled={isSaving || mix.trees.length === 0}
                      >
                        <TreePine className="h-5 w-5 mr-2 transition-transform group-hover:-rotate-6" />
                        Plant Trees
                        <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
