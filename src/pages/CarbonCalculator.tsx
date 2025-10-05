import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInDays } from "date-fns";
import { CalendarIcon, Plane, MapPin, Users, Hotel, Calendar as CalIcon, Minus, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { airports, calculateDistance } from "@/data/airports";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const flightSchema = z.object({
  originAirport: z.string().min(3, "Please select departure airport"),
  destinationAirport: z.string().min(3, "Please select arrival airport"),
});

const formSchema = z.object({
  tripType: z.enum(["return", "oneway", "multicity"]),
  inputMode: z.enum(["airports", "flighttime"]),
  travelClass: z.enum(["economy", "premium_economy", "business", "first"]),
  flights: z.array(flightSchema).optional(),
  flightHours: z.number().min(0.5).max(20),
  fromDate: z.date({
    required_error: "From date is required",
  }),
  toDate: z.date().optional(),
  accommodationType: z.enum(["none", "hotel", "rental", "cruise", "service_apartment"]),
  numTravelers: z.number().min(1).max(20),
}).refine(
  (data) => {
    if (data.inputMode === "airports") {
      return data.flights && data.flights.length > 0 && 
             data.flights.every(f => f.originAirport && f.destinationAirport);
    }
    return true;
  },
  {
    message: "Please select both departure and arrival airports",
    path: ["flights"],
  }
);

type FormData = z.infer<typeof formSchema>;

interface CalculationResult {
  distance: number;
  flightCO2: number;
  accommodationCO2: number;
  totalCO2: number;
  treesNeeded: number;
  nights: number;
}

// Emission factors based on realistic benchmarks (London-Nairobi 6818km reference)
const EMISSION_FACTORS = {
  flight: {
    economy: 0.117,        // 798 kg CO2 / 6818 km
    premium_economy: 0.187, // 1276.8 kg CO2 / 6818 km
    business: 0.339,        // 2314 kg CO2 / 6818 km
    first: 0.468,           // 3191.9 kg CO2 / 6818 km
  },
  accommodation: {
    none: 0,
    hotel: 16.7,
    rental: 10,
    cruise: 50,
    service_apartment: 12,
  },
};

// Tree offset capacity: ~160 kg CO2 per tree (based on benchmark: 798kg / 5 trees)
const KG_CO2_PER_TREE = 160;

const TRAVEL_CLASS_LABELS = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
};

const ACCOMMODATION_LABELS = {
  none: "No Accommodation",
  hotel: "Hotel",
  rental: "Rental",
  cruise: "Cruise Ship",
  service_apartment: "Service Apartment",
};

export const CarbonCalculator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "flights",
  });

  const calculateEmissions = (data: FormData): CalculationResult => {
    let totalDistance = 0;
    let flightCO2 = 0;

    if (data.inputMode === "airports" && data.flights) {
      // Calculate based on airports
      data.flights.forEach(flight => {
        const origin = airports.find(a => a.code === flight.originAirport);
        const destination = airports.find(a => a.code === flight.destinationAirport);
        
        if (origin && destination) {
          const distance = calculateDistance(origin, destination);
          totalDistance += distance;
        }
      });

      // Apply trip type multiplier
      const tripMultiplier = data.tripType === "return" ? 2 : 1;
      totalDistance *= tripMultiplier;
    } else if (data.inputMode === "flighttime") {
      // Calculate based on flight hours
      const avgSpeed = 850; // km/h average flight speed
      totalDistance = data.flightHours * avgSpeed;
      
      // Apply trip type multiplier
      if (data.tripType === "return") {
        totalDistance *= 2;
      }
    }

    // Calculate flight CO2
    const emissionFactor = EMISSION_FACTORS.flight[data.travelClass];
    flightCO2 = totalDistance * emissionFactor * data.numTravelers;
    
    // Calculate nights
    let nights = 0;
    if (data.toDate) {
      nights = Math.max(1, differenceInDays(data.toDate, data.fromDate));
    }
    
    // Calculate accommodation CO2
    const accommodationFactor = EMISSION_FACTORS.accommodation[data.accommodationType];
    const accommodationCO2 = accommodationFactor * nights * data.numTravelers;
    
    // Calculate total and trees needed (rounded to nearest whole number)
    const totalCO2 = flightCO2 + accommodationCO2;
    const treesNeeded = Math.round(totalCO2 / KG_CO2_PER_TREE);
    
    return {
      distance: totalDistance,
      flightCO2,
      accommodationCO2,
      totalCO2,
      treesNeeded,
      nights,
    };
  };

  const onCalculate = async (data: FormData) => {
    setIsCalculating(true);
    try {
      const result = calculateEmissions(data);
      setCalculation(result);
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "Failed to calculate emissions. Please check your inputs.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const onSaveTrip = async () => {
    if (!calculation) return;
    
    setIsSaving(true);
    try {
      const data = form.getValues();
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save your trip.",
          variant: "destructive",
        });
        return;
      }

      // Map form values to database enum values
      const travelClassMap: Record<FormData['travelClass'], 'Economy' | 'Premium Economy' | 'Business' | 'First'> = {
        economy: 'Economy',
        premium_economy: 'Premium Economy',
        business: 'Business',
        first: 'First',
      };

      const accommodationTypeMap: Record<FormData['accommodationType'], 'None' | 'Hotel' | 'Rental' | 'Cruise Ship' | 'Service Apartment'> = {
        none: 'None',
        hotel: 'Hotel',
        rental: 'Rental',
        cruise: 'Cruise Ship',
        service_apartment: 'Service Apartment',
      };

      const { error } = await supabase.from("trips").insert([{
        user_id: userData.user.id,
        origin_airport: data.flights[0]?.originAirport || "",
        destination_airport: data.flights[0]?.destinationAirport || "",
        travel_class: travelClassMap[data.travelClass],
        is_return: data.tripType === "return",
        from_date: format(data.fromDate, "yyyy-MM-dd"),
        to_date: data.toDate ? format(data.toDate, "yyyy-MM-dd") : format(data.fromDate, "yyyy-MM-dd"),
        accommodation_type: data.accommodationType === 'none' ? null : accommodationTypeMap[data.accommodationType],
        num_travelers: data.numTravelers,
        flight_co2: calculation.flightCO2,
        accommodation_co2: calculation.accommodationCO2,
        total_co2: calculation.totalCO2,
        trees_needed: calculation.treesNeeded,
      }]);

      if (error) throw error;

      toast({
        title: "Trip Saved",
        description: "Your trip has been saved successfully.",
      });
      
      // Navigate to My Trips page
      navigate("/my-trips");
    } catch (error) {
      console.error("Error saving trip:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save your trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onPlantTrees = async () => {
    if (!calculation) return;
    
    setIsSaving(true);
    try {
      const data = form.getValues();
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to plant trees.",
          variant: "destructive",
        });
        return;
      }

      // Map form values to database enum values
      const travelClassMap: Record<FormData['travelClass'], 'Economy' | 'Premium Economy' | 'Business' | 'First'> = {
        economy: 'Economy',
        premium_economy: 'Premium Economy',
        business: 'Business',
        first: 'First',
      };

      const accommodationTypeMap: Record<FormData['accommodationType'], 'None' | 'Hotel' | 'Rental' | 'Cruise Ship' | 'Service Apartment'> = {
        none: 'None',
        hotel: 'Hotel',
        rental: 'Rental',
        cruise: 'Cruise Ship',
        service_apartment: 'Service Apartment',
      };

      // First, save the trip to get the trip_id
      const { data: tripData, error: tripError } = await supabase.from("trips").insert([{
        user_id: userData.user.id,
        origin_airport: data.flights?.[0]?.originAirport || "",
        destination_airport: data.flights?.[0]?.destinationAirport || "",
        travel_class: travelClassMap[data.travelClass],
        is_return: data.tripType === "return",
        from_date: format(data.fromDate, "yyyy-MM-dd"),
        to_date: data.toDate ? format(data.toDate, "yyyy-MM-dd") : format(data.fromDate, "yyyy-MM-dd"),
        accommodation_type: data.accommodationType === 'none' ? null : accommodationTypeMap[data.accommodationType],
        num_travelers: data.numTravelers,
        flight_co2: calculation.flightCO2,
        accommodation_co2: calculation.accommodationCO2,
        total_co2: calculation.totalCO2,
        trees_needed: calculation.treesNeeded,
      }]).select().single();

      if (tripError) throw tripError;

      // Navigate to tree purchase with trip_id
      navigate("/tree-purchase", {
        state: {
          treesNeeded: calculation.treesNeeded,
          totalCO2: calculation.totalCO2,
          tripData: data,
          tripId: tripData?.id,
        },
      });
    } catch (error) {
      console.error("Error saving trip:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save your trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tripType = form.watch("tripType");
  const inputMode = form.watch("inputMode");
  const fromDate = form.watch("fromDate");
  const toDate = form.watch("toDate");

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">Carbon Calculator</h1>
          <p className="text-muted-foreground">Calculate your travel's carbon footprint and offset it with trees</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-6">
            {/* Trip Type Radio Buttons */}
            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="tripType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-6"
                      >
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

              {/* Input Mode Tabs */}
              <FormField
                control={form.control}
                name="inputMode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex gap-0 border-b-2 border-border">
                        <button
                          type="button"
                          onClick={() => field.onChange("airports")}
                          className={cn(
                            "px-6 py-2 text-sm font-medium transition-colors border-b-2 -mb-0.5",
                            field.value === "airports"
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Airports
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange("flighttime")}
                          className={cn(
                            "px-6 py-2 text-sm font-medium transition-colors border-b-2 -mb-0.5",
                            field.value === "flighttime"
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Flight Time
                        </button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Airports Mode */}
            {inputMode === "airports" && (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* Trip From */}
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

                    {/* Trip To */}
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-8"
                          onClick={() => remove(index)}
                        >
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

            {/* Flight Time Mode */}
            {inputMode === "flighttime" && (
              <FormField
                control={form.control}
                name="flightHours"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-4">
                      <FormLabel>Flight Time (Hours one way)</FormLabel>
                      <span className="text-lg font-semibold">{field.value} Hours</span>
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

            {/* Two Column Layout for remaining fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Number of Travelers */}
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
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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

                {/* Accommodation Type */}
                <FormField
                  control={form.control}
                  name="accommodationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-foreground">
                        <Hotel className="h-4 w-4" />
                        Accommodation Type
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              {/* Right Column */}
              <div className="space-y-6">
                {/* Travelled by */}
                <FormField
                  control={form.control}
                  name="travelClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-foreground">
                        <Plane className="h-4 w-4" />
                        Travelled by
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                {/* Dates/Days */}
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-foreground">
                    <CalIcon className="h-4 w-4" />
                    Dates/Days
                  </FormLabel>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate && toDate ? (
                          <>
                            {format(fromDate, "EEE dd MMM")} - {format(toDate, "EEE dd MMM")} ({differenceInDays(toDate, fromDate)} days)
                            <X 
                              className="ml-auto h-4 w-4" 
                              onClick={(e) => {
                                e.stopPropagation();
                                form.setValue("fromDate", undefined as any);
                                form.setValue("toDate", undefined);
                              }}
                            />
                          </>
                        ) : (
                          <span>Select date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium mb-2 text-center">From Date</p>
                            <Calendar
                              mode="single"
                              selected={fromDate}
                              onSelect={(date) => {
                                form.setValue("fromDate", date as Date);
                                // For one-way trips, allow same date selection
                                if (tripType === "oneway" && !toDate) {
                                  form.setValue("toDate", date);
                                }
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
                              disabled={(date) => {
                                if (!fromDate) return false;
                                // For one-way, allow same date; for return, allow same or later
                                return tripType === "oneway" ? date < fromDate : date < fromDate;
                              }}
                              className="pointer-events-auto"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end border-t pt-3 mt-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                form.setValue("fromDate", undefined as any);
                                form.setValue("toDate", undefined);
                              }}
                            >
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
                    </PopoverContent>
                  </Popover>
                </FormItem>
              </div>
            </div>

            {/* Calculate Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isCalculating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 text-lg"
              >
                {isCalculating ? "Calculating..." : "Calculate My Footprint"}
              </Button>
            </div>
          </form>
        </Form>

        {/* Calculation Results */}
        {calculation && (
          <div className="mt-8 p-6 border-2 border-primary rounded-lg bg-card">
            <h2 className="text-2xl font-bold mb-2">Your Carbon Footprint</h2>
            <p className="text-muted-foreground mb-6">Based on your travel details</p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
                <span className="text-sm font-medium">Flight Carbon Footprint:</span>
                <span className="text-sm">
                  {calculation.distance.toLocaleString()} km by Plane: 
                  <strong className="ml-2">{calculation.flightCO2.toFixed(1)} kg CO2</strong>
                </span>
              </div>

              {calculation.accommodationCO2 > 0 && (
                <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
                  <span className="text-sm font-medium">Stay Carbon Footprint:</span>
                  <span className="text-sm">
                    {ACCOMMODATION_LABELS[form.getValues("accommodationType")]} - {calculation.nights} nights: 
                    <strong className="ml-2">{calculation.accommodationCO2.toFixed(1)} kg CO2</strong>
                  </span>
                </div>
              )}

              <div className="p-6 bg-gradient-to-r from-primary to-primary/80 rounded-lg text-center">
                <p className="text-sm font-medium mb-2 text-primary-foreground">TOTAL TRIP CO2</p>
                <p className="text-4xl font-bold text-primary-foreground">{calculation.totalCO2.toFixed(1)} kg CO2</p>
              </div>

              <div className="p-6 bg-accent text-accent-foreground rounded-lg text-center">
                <p className="text-lg font-semibold">
                  You'll need <span className="text-3xl font-bold">{calculation.treesNeeded}</span> trees
                </p>
                <p className="text-sm mt-1">to remove this trip's CO2 emissions</p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onSaveTrip}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Trip"}
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={onPlantTrees}
              >
                Plant Trees
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
