import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays, format } from "date-fns";
import { ArrowRight, Leaf, Loader2, Plane, Save } from "lucide-react";
import { toast } from "sonner";
import { airports } from "@/data/airports";
import { EMISSION_FACTORS, getFlightEmissions, type CabinClass } from "@/utils/emissionCalculatorApi";
import { useStore } from "@/contexts/StoreContext";
import { suggestTreeMix } from "@/lib/treeMix";
import { apiErrorMessage } from "@/lib/api";
import { kg, treeCount, usd } from "@/lib/format";
import type { AccommodationType, TravelClass } from "@/types/otot";
import { TouristPage } from "@/components/layout/TouristPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const schema = z.object({
  tripType: z.enum(["return", "oneway"]),
  inputMode: z.enum(["airports", "flighttime"]),
  travelClass: z.enum(["economy", "premium_economy", "business", "first"]),
  origin: z.string(),
  destination: z.string(),
  flightHours: z.coerce.number().min(0.5).max(24),
  nights: z.coerce.number().min(0).max(60),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accommodationType: z.enum(["none", "hotel", "rental", "cruise", "service_apartment"]),
  numTravelers: z.coerce.number().min(1).max(20),
});

type FormData = z.infer<typeof schema>;

export default function CarbonCalculator() {
  const navigate = useNavigate();
  const { state, createTrip } = useStore();
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    totalCO2: number;
    flightCO2: number;
    accommodationCO2: number;
    distance: number;
    source: string;
  } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tripType: "return",
      inputMode: "airports",
      travelClass: "economy",
      origin: "LHR",
      destination: "NBO",
      flightHours: 8,
      nights: 7,
      fromDate: format(new Date(), "yyyy-MM-dd"),
      accommodationType: "hotel",
      numTravelers: 1,
    },
  });

  const inputMode = form.watch("inputMode");
  const mix = useMemo(
    () => (result ? suggestTreeMix(result.totalCO2, state.treeTypes) : null),
    [result, state.treeTypes],
  );

  const onSubmit = async (data: FormData) => {
    setBusy(true);
    try {
      const isReturn = data.tripType === "return";
      const flight =
        data.inputMode === "airports"
          ? await getFlightEmissions({
              cabinClass: data.travelClass as CabinClass,
              numTravelers: data.numTravelers,
              isReturn,
              legs: [{ origin: data.origin, destination: data.destination }],
            })
          : await getFlightEmissions({
              cabinClass: data.travelClass as CabinClass,
              numTravelers: data.numTravelers,
              isReturn,
              distanceKm: data.flightHours * 850,
            });
      const nights = Math.max(0, data.nights);
      const accommodationCO2 =
        EMISSION_FACTORS.accommodation[data.accommodationType] * nights * data.numTravelers;
      setResult({
        totalCO2: flight.flightCO2 + accommodationCO2,
        flightCO2: flight.flightCO2,
        accommodationCO2,
        distance: flight.distance,
        source: flight.source,
      });
    } catch {
      toast.error("Could not calculate emissions");
    } finally {
      setBusy(false);
    }
  };

  const persistTrip = async () => {
    if (!result || !mix) throw new Error("Calculate the trip first");
    const data = form.getValues();
    const fromDate = data.fromDate;
    const toDate = format(addDays(new Date(`${fromDate}T00:00:00`), data.nights), "yyyy-MM-dd");
    return createTrip({
      originAirport: data.origin,
      destinationAirport: data.destination,
      travelClass: data.travelClass as TravelClass,
      isReturn: data.tripType === "return",
      fromDate,
      toDate,
      accommodationType: data.accommodationType as AccommodationType,
      numTravelers: data.numTravelers,
      flightCo2: result.flightCO2,
      accommodationCo2: result.accommodationCO2,
      totalCo2: result.totalCO2,
      treesNeeded: treeCount(mix.trees),
      distanceKm: result.distance || undefined,
    });
  };

  const saveTrip = async (thenDonate: boolean) => {
    setSaving(true);
    try {
      const trip = await persistTrip();
      toast.success("Trip saved");
      if (thenDonate) {
        navigate("/donate", {
          state: {
            carbonOffsetKg: result?.totalCO2,
            trees: mix?.trees,
            tripId: trip.id,
          },
        });
      } else {
        navigate("/my-trips");
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <TouristPage
      title="Carbon Calculator"
      subtitle="Flight emissions come from the carbon offset API when it is available, then we suggest a tree mix and donation amount."
      className="max-w-4xl"
    >

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" /> Trip details
          </CardTitle>
          <CardDescription>Airports or flight time. Accommodation is estimated locally.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="inputMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How do you want to enter the flight?</FormLabel>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="airports" /> Airports
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value="flighttime" /> Flight time
                      </label>
                    </RadioGroup>
                  </FormItem>
                )}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tripType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="return">Return</SelectItem>
                          <SelectItem value="oneway">One way</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="travelClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cabin</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="economy">Economy</SelectItem>
                          <SelectItem value="premium_economy">Premium economy</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="first">First</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              {inputMode === "airports" ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-72">
                            {airports.map((a) => (
                              <SelectItem key={a.code} value={a.code}>
                                {a.code} — {a.city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-72">
                            {airports.map((a) => (
                              <SelectItem key={`d-${a.code}`} value={a.code}>
                                {a.code} — {a.city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="flightHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight hours (one way)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <div className="grid sm:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="numTravelers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travelers</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nights"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nights</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fromDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accommodationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stay</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="rental">Rental</SelectItem>
                          <SelectItem value="cruise">Cruise</SelectItem>
                          <SelectItem value="service_apartment">Serviced apartment</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Calculate offset
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {result && mix && (
        <Card className="glass-card border-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" /> Suggested offset
            </CardTitle>
            <CardDescription>
              {kg(result.totalCO2)} CO₂ ({result.source === "service" ? "emission API" : "local fallback"}
              {result.distance ? ` · ${Math.round(result.distance)} km` : ""}). Flight {kg(result.flightCO2)}, stay{" "}
              {kg(result.accommodationCO2)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-1">
              {mix.trees.map((t) => (
                <li key={t.treeTypeId}>
                  {t.count} × {t.treeType}
                </li>
              ))}
            </ul>
            <p className="text-lg font-semibold">{usd(mix.amount)} suggested donation</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" disabled={saving} onClick={() => void saveTrip(false)}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save trip
              </Button>
              <Button disabled={saving} onClick={() => void saveTrip(true)}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue to donate <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </TouristPage>
  );
}
