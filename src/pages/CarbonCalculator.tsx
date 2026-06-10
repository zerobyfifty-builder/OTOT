import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInDays } from "date-fns";
import { CalendarIcon, Plane, MapPin, Users, Hotel, Calendar as CalIcon, Minus, Plus, X, TreePine, Leaf, Sparkles, ArrowRight, Cloud, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCarbonCalculation } from "@/hooks/useCarbonCalculation";
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
import { EmailCaptureModal } from "@/components/pledge/EmailCaptureModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import ktbLogo from '@/assets/ktb-logo.png';

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
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const isMobile = useIsMobile();
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [pendingAction, setPendingAction] = useState<'save' | 'plant' | null>(null);
  const [calculatorContext, setCalculatorContext] = useState<any>(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);

  // Live carbon calculation with sequestration rates
  const calcResult = useCarbonCalculation(
    calculation ? { totalCO2_kg: calculation.totalCO2, tripId: savedTripId, userId: user?.id || null } : null
  );

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

  // Handle context from landing page or deep link
  useEffect(() => {
    if (location.state?.context) {
      setCalculatorContext(location.state.context);
    }
  }, [location]);

  // Restore calculator data from sessionStorage after magic link login
  useEffect(() => {
    const savedCalculator = sessionStorage.getItem('calculator-data');
    if (savedCalculator && user) {
      try {
        const data = JSON.parse(savedCalculator);
        form.reset(data.formData);
        setCalculation(data.calculation);
        sessionStorage.removeItem('calculator-data');
        
        toast({
          title: "Welcome back!",
          description: "Your calculator data has been restored.",
        });
      } catch (error) {
        console.error('Error restoring calculator data:', error);
      }
    }
  }, [user]);

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
      // Smoothly scroll to the results section after render
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
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
    
    // If not logged in, trigger magic link flow
    if (!user) {
      // Save calculator data to sessionStorage
      const calculatorData = {
        formData: form.getValues(),
        calculation,
      };
      sessionStorage.setItem('calculator-data', JSON.stringify(calculatorData));
      
      setPendingAction('save');
      setShowEmailCapture(true);
      return;
    }
    
    setIsSaving(true);
    try {
      const data = form.getValues();

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
        user_id: user.id,
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
        trees_needed: calcResult?.treesNeeded ?? calculation.treesNeeded,
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
    
    // If not logged in, trigger magic link flow
    if (!user) {
      // Save calculator data to sessionStorage
      const calculatorData = {
        formData: form.getValues(),
        calculation,
      };
      sessionStorage.setItem('calculator-data', JSON.stringify(calculatorData));
      
      setPendingAction('plant');
      setShowEmailCapture(true);
      return;
    }
    
    setIsSaving(true);
    try {
      const data = form.getValues();

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
        user_id: user.id,
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
        trees_needed: calcResult?.treesNeeded ?? calculation.treesNeeded,
      }]).select().single();

      if (tripError) throw tripError;

      // Navigate to tree purchase with trip_id and carbon calc data
      navigate("/tree-purchase", {
        state: {
          treesNeeded: calcResult?.treesNeeded ?? calculation.treesNeeded,
          totalCO2: calculation.totalCO2,
          tripData: data,
          tripId: tripData?.id,
          donationUSDPerTree: calcResult?.donationUSDPerTree ?? 4.5,
          speciesLabel: calcResult?.speciesLabel ?? 'Mixed indigenous species',
          rateUsed: calcResult?.rateUsed ?? 22,
          sliderMax: calcResult?.sliderMax ?? calculation.treesNeeded,
          treeCreditPct: calcResult?.treeCreditPct ?? 0,
          treeDebtPct: calcResult?.treeDebtPct ?? 100,
          treesPlantedPrior: calcResult?.treesPlantedPrior ?? 0,
          treesCommittedPrior: calcResult?.treesCommittedPrior ?? 0,
          speciesId: calcResult?.speciesId ?? null,
          survivalRate: calcResult?.survivalRate ?? 0.85,
          horizonYears: calcResult?.horizonYears ?? 20,
          configId: calcResult?.configId ?? null,
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Carbon Calculator</h1>
            <p className="text-muted-foreground">Calculate your travel's carbon footprint and offset it with trees</p>
          </div>
          <img src={ktbLogo} alt="Kenya Tourism Board" className="hidden h-20 object-contain md:block" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-6">
            {/* Trip Type Radio Buttons */}
            <div className="flex flex-col-reverse items-stretch gap-4 md:flex-row md:items-center md:justify-between md:gap-0">
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
                      <div className="flex justify-start gap-0 border-b-2 border-border md:justify-end">
                        <button
                          type="button"
                          onClick={() => field.onChange("airports")}
                          className={cn(
                            "px-6 py-2 text-base font-semibold transition-colors border-b-2 -mb-0.5",
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
                            "px-6 py-2 text-base font-semibold transition-colors border-b-2 -mb-0.5",
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
                    <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
                      {isMobile ? (
                        <div className="p-4 w-[min(360px,calc(100vw-2rem))]">
                          {/* Two date input boxes */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="rounded-lg border bg-background px-3 py-2">
                              <p className="text-xs text-muted-foreground mb-0.5">From (Onward)</p>
                              <p className="text-sm font-medium text-foreground">
                                {fromDate ? format(fromDate, "MMM d") : "—"}
                              </p>
                            </div>
                            <div className="rounded-lg border bg-background px-3 py-2">
                              <p className="text-xs text-muted-foreground mb-0.5">To (Return)</p>
                              <p className="text-sm font-medium text-foreground">
                                {toDate ? format(toDate, "MMM d") : "—"}
                              </p>
                            </div>
                          </div>

                          {/* Single calendar in range mode */}
                          <Calendar
                            mode="range"
                            selected={{ from: fromDate, to: toDate }}
                            onSelect={(range) => {
                              form.setValue("fromDate", (range?.from as Date) ?? (undefined as any));
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
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                form.setValue("fromDate", undefined as any);
                                form.setValue("toDate", undefined);
                              }}
                            >
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
                                form.setValue("fromDate", date as Date);
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
                      )}
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
        {calculation && (() => {
          const treesNeeded = calcResult?.treesNeeded ?? calculation.treesNeeded;
          const visibleTrees = Math.min(treesNeeded, 12);
          return (
          <div ref={resultsRef} className="mt-8 animate-fade-in scroll-mt-20">
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl">
              {/* Decorative background */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
                <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-accent blur-3xl" />
              </div>

              <div className="relative p-6 sm:p-8">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Carbon Footprint</h2>
                    <p className="text-sm text-muted-foreground">Turn your travel into climate action!</p>
                  </div>
                  <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 animate-scale-in">
                    <Cloud className="h-7 w-7 text-primary" />
                  </div>
                </div>

                {/* Breakdown chips */}
                <div className="grid gap-3 sm:grid-cols-2 mb-6">
                  <div className="group flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/40 hover:shadow-md">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Flight · {calculation.distance.toLocaleString()} km</p>
                      <p className="text-base font-semibold tabular-nums">{calculation.flightCO2.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg CO₂</span></p>
                    </div>
                  </div>

                  {calculation.accommodationCO2 > 0 && (
                    <div className="group flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-4 transition-all hover:border-primary/40 hover:shadow-md">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                        <Hotel className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{ACCOMMODATION_LABELS[form.getValues("accommodationType")]} · {calculation.nights} nights</p>
                        <p className="text-base font-semibold tabular-nums">{calculation.accommodationCO2.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg CO₂</span></p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hero impact panel */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-6 sm:p-8 text-primary-foreground shadow-xl">
                  {/* Floating clouds */}
                  <Wind className="absolute top-4 right-6 h-5 w-5 opacity-30 animate-fade-in" />
                  <Cloud className="absolute top-10 right-16 h-4 w-4 opacity-20" style={{ animation: 'fade-in 1s ease-out 0.3s both' }} />

                  <div className="grid gap-6 sm:grid-cols-2 items-center">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] font-medium opacity-80">Total trip emissions</p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">{calculation.totalCO2.toFixed(1)}</span>
                        <span className="text-sm opacity-90">kg CO₂</span>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs">
                        <Leaf className="h-3.5 w-3.5" />
                        Offset with native trees
                      </div>
                    </div>

                    <div className="relative">
                      <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-5 border border-white/20">
                        <p className="text-[11px] uppercase tracking-[0.18em] opacity-80">Trees to plant</p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-5xl sm:text-6xl font-bold tabular-nums">{treesNeeded}</span>
                          <TreePine className="h-7 w-7 text-emerald-300" strokeWidth={2.5} fill="#10b981" fillOpacity={0.55} />
                        </div>
                        {/* Animated mini-forest */}
                        <style>{`
                          @keyframes tree-grow-loop {
                            0% { transform: scale(0) translateY(4px); opacity: 0; }
                            15% { transform: scale(1.08) translateY(0); opacity: 1; }
                            22% { transform: scale(1) translateY(0); opacity: 1; }
                            85% { transform: scale(1) translateY(0); opacity: 1; }
                            100% { transform: scale(0) translateY(4px); opacity: 0; }
                          }
                        `}</style>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {Array.from({ length: visibleTrees }).map((_, i) => (
                            <TreePine
                              key={i}
                              className="h-5 w-5 text-emerald-300"
                              strokeWidth={2.5}
                              fill="#10b981"
                              fillOpacity={0.55}
                              style={{
                                animation: `tree-grow-loop ${Math.max(4, visibleTrees * 0.25 + 2.5)}s ease-in-out ${i * 0.18}s infinite both`,
                                transformOrigin: 'bottom center',
                              }}
                            />
                          ))}
                          {treesNeeded > visibleTrees && (
                            <span className="ml-1 self-center text-xs font-medium opacity-90">+{treesNeeded - visibleTrees} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {calcResult && (
                    <p className="mt-5 text-[11px] sm:text-xs opacity-85 border-t border-white/15 pt-3">
                      Effective Rate: {calcResult.speciesLabel} · {calcResult.effectiveRate.toFixed(1)} kg CO₂ /tree/yr · {calcResult.horizonYears}-year offset
                    </p>
                  )}
                </div>

                {calcResult?.configWarning && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    ⚠️ {calcResult.configWarning}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-2"
                    onClick={onSaveTrip}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Trip"}
                  </Button>
                  <Button
                    className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover-scale group"
                    onClick={onPlantTrees}
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

      {/* Email Capture Modal for Magic Link Flow */}
      <EmailCaptureModal
        open={showEmailCapture}
        onOpenChange={setShowEmailCapture}
        pledgeContext={{
          redirectUrl: '/carbon-calculator',
        }}
      />
    </div>
  );
};
