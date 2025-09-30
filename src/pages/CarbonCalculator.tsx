import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plane, Hotel, Users, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { airports, calculateDistance } from "@/data/airports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  travelClass: z.enum(["economy", "premium_economy", "business", "first"]),
  isReturn: z.boolean().default(false),
  originAirport: z.string().min(3, "Please select departure airport"),
  destinationAirport: z.string().min(3, "Please select arrival airport"),
  fromDate: z.date({
    required_error: "From date is required",
  }),
  toDate: z.date({
    required_error: "To date is required",
  }),
  accommodationType: z.enum(["none", "hotel", "rental", "cruise", "service_apartment"]),
  numTravelers: z.number().min(1).max(20),
}).refine((data) => data.toDate >= data.fromDate, {
  message: "To date must be after from date",
  path: ["toDate"],
});

type FormData = z.infer<typeof formSchema>;

interface CalculationResult {
  distance: number;
  flightCO2: number;
  accommodationCO2: number;
  totalCO2: number;
  treesNeeded: number;
  nights: number;
}

// Emission factors
const EMISSION_FACTORS = {
  flight: {
    economy: 0.255,
    premium_economy: 0.38,
    business: 0.51,
    first: 0.68,
  },
  accommodation: {
    none: 0,
    hotel: 16.7,
    rental: 10,
    cruise: 50,
    service_apartment: 12,
  },
};

const TRAVEL_CLASS_LABELS = {
  economy: "Plane - Economy",
  premium_economy: "Plane - Premium Economy",
  business: "Plane - Business",
  first: "Plane - First",
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      travelClass: "economy",
      isReturn: false,
      numTravelers: 1,
      accommodationType: "none",
    },
  });

  const calculateEmissions = (data: FormData): CalculationResult => {
    // Find airports
    const origin = airports.find(a => a.code === data.originAirport);
    const destination = airports.find(a => a.code === data.destinationAirport);
    
    if (!origin || !destination) {
      throw new Error("Invalid airports");
    }

    // Calculate distance
    const distance = calculateDistance(origin, destination);
    
    // Calculate flight CO2
    const emissionFactor = EMISSION_FACTORS.flight[data.travelClass];
    const tripMultiplier = data.isReturn ? 2 : 1;
    const flightCO2 = distance * emissionFactor * data.numTravelers * tripMultiplier;
    
    // Calculate nights
    const nights = Math.ceil((data.toDate.getTime() - data.fromDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate accommodation CO2
    const accommodationFactor = EMISSION_FACTORS.accommodation[data.accommodationType];
    const accommodationCO2 = accommodationFactor * nights * data.numTravelers;
    
    // Calculate total and trees needed
    const totalCO2 = flightCO2 + accommodationCO2;
    const treesNeeded = Math.ceil(totalCO2 / 22); // 22 kg CO2 per tree per year
    
    return {
      distance,
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

      const { error } = await supabase.from("trips").insert([{
        user_id: userData.user.id,
        origin_airport: data.originAirport,
        destination_airport: data.destinationAirport,
        travel_class: data.travelClass as any,
        is_return: data.isReturn,
        from_date: format(data.fromDate, "yyyy-MM-dd"),
        to_date: format(data.toDate, "yyyy-MM-dd"),
        accommodation_type: data.accommodationType as any,
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

  const onPlantTrees = () => {
    if (!calculation) return;
    
    const data = form.getValues();
    navigate("/tree-purchase", {
      state: {
        treesNeeded: calculation.treesNeeded,
        totalCO2: calculation.totalCO2,
        tripData: data,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Carbon Calculator</h1>
          <p className="text-muted-foreground">Calculate your travel's carbon footprint and offset it with trees</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-6">
            {/* Travel Method Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  Travel Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="travelClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travelled by</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select travel class" />
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

                <FormField
                  control={form.control}
                  name="isReturn"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Return trip (doubles calculation)</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Route Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Route
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="originAirport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip From</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select departure airport" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {airports.map((airport) => (
                            <SelectItem key={airport.code} value={airport.code}>
                              {airport.city} - {airport.name} ({airport.code})
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
                  name="destinationAirport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select arrival airport" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {airports.map((airport) => (
                            <SelectItem key={airport.code} value={airport.code}>
                              {airport.city} - {airport.name} ({airport.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Dates Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="fromDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>From Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>To Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Accommodation Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-primary" />
                  Accommodation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="accommodationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accommodation Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select accommodation type" />
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
              </CardContent>
            </Card>

            {/* Travelers Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Travelers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="numTravelers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Travelers</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Calculate Button */}
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isCalculating}
            >
              {isCalculating ? "Calculating..." : "Calculate Emissions"}
            </Button>
          </form>
        </Form>

        {/* Calculation Results */}
        {calculation && (
          <Card className="mt-8 border-primary">
            <CardHeader>
              <CardTitle className="text-2xl">Your Carbon Footprint</CardTitle>
              <CardDescription>Based on your travel details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
                  <span className="text-sm font-medium">Flight Carbon Footprint:</span>
                  <span className="text-sm">
                    {form.getValues("isReturn") ? "2" : "1"} × {calculation.distance.toLocaleString()} km by Plane: 
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

                <div className="p-6 bg-gradient-primary rounded-lg text-center">
                  <p className="text-sm font-medium mb-2">TOTAL TRIP CO2</p>
                  <p className="text-4xl font-bold">{calculation.totalCO2.toFixed(1)} kg CO2</p>
                </div>

                <div className="p-6 bg-accent text-accent-foreground rounded-lg text-center">
                  <p className="text-lg font-semibold">
                    You'll need <span className="text-3xl font-bold">{calculation.treesNeeded}</span> trees
                  </p>
                  <p className="text-sm mt-1">to remove this trip's CO2 emissions</p>
                </div>
              </div>

              <div className="flex gap-4">
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
