import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInDays } from "date-fns";
import { CalendarIcon, Plane, ArrowRight, ArrowLeft, TreePine, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/contexts/AgentAuthContext";
import { useToast } from "@/hooks/use-toast";
import { airports } from "@/data/airports";
import { getFlightEmissions, EMISSION_FACTORS, KG_CO2_PER_TREE } from "@/utils/emissionCalculatorApi";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ktbLogo from '@/assets/ktb-logo.png';

// Step 1 schema: Ticket Details
const ticketSchema = z.object({
  staffName: z.string().min(2, "Staff name is required"),
  pnrNumber: z.string().min(2, "PNR number is required"),
  ticketNumber: z.string().min(2, "Ticket number is required"),
  ticketIssueDate: z.date({ required_error: "Ticket issue date is required" }),
  lpoNumber: z.string().min(2, "LPO number is required"),
  department: z.string().min(1, "Department is required"),
});

// Step 2 schema: Flight Details
const flightSchema = z.object({
  tripType: z.enum(["return", "oneway"]),
  travelClass: z.enum(["economy", "premium_economy", "business", "first"]),
  originAirport: z.string().min(3, "Please select departure airport"),
  destinationAirport: z.string().min(3, "Please select arrival airport"),
  fromDate: z.date({ required_error: "Travel date is required" }),
  toDate: z.date().optional(),
  accommodationType: z.enum(["none", "hotel", "rental", "cruise", "service_apartment"]),
  numTravelers: z.number().min(1).max(20),
});

type TicketData = z.infer<typeof ticketSchema>;
type FlightData = z.infer<typeof flightSchema>;

interface CalculationResult {
  distance: number;
  flightCO2: number;
  accommodationCO2: number;
  totalCO2: number;
  treesNeeded: number;
  nights: number;
}

const COST_PER_TREE_KES = 500;

const TRAVEL_CLASS_LABELS: Record<string, string> = {
  economy: "Economy", premium_economy: "Premium Economy", business: "Business", first: "First",
};

const ACCOMMODATION_LABELS: Record<string, string> = {
  none: "No Accommodation", hotel: "Hotel", rental: "Rental", cruise: "Cruise Ship", service_apartment: "Service Apartment",
};

export const AgentCalculateOffset = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { agent } = useAgentAuth();
  const [step, setStep] = useState(1);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const ticketForm = useForm<TicketData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { department: agent?.organization_name || "" },
  });

  useEffect(() => {
    if (agent?.organization_name) {
      ticketForm.setValue("department", agent.organization_name);
    }
  }, [agent?.organization_name]);

  const flightForm = useForm<FlightData>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      tripType: "return",
      travelClass: "economy",
      numTravelers: 1,
      accommodationType: "none",
    },
  });

  const onTicketSubmit = (data: TicketData) => {
    setTicketData(data);
    setStep(2);
  };

  const calculateEmissions = async (data: FlightData): Promise<CalculationResult> => {
    // Flight CO2 from the Emission Calculator service (falls back to local).
    const { distance: totalDistance, flightCO2 } = await getFlightEmissions({
      cabinClass: data.travelClass,
      numTravelers: data.numTravelers,
      isReturn: data.tripType === "return",
      legs: [{ origin: data.originAirport, destination: data.destinationAirport }],
    });

    let nights = 0;
    if (data.toDate) {
      nights = Math.max(1, differenceInDays(data.toDate, data.fromDate));
    }
    const accommodationFactor = EMISSION_FACTORS.accommodation[data.accommodationType];
    const accommodationCO2 = accommodationFactor * nights * data.numTravelers;
    const totalCO2 = flightCO2 + accommodationCO2;
    const treesNeeded = Math.max(1, Math.round(totalCO2 / KG_CO2_PER_TREE));

    return { distance: totalDistance, flightCO2, accommodationCO2, totalCO2, treesNeeded, nights };
  };

  const onFlightSubmit = async (data: FlightData) => {
    const result = await calculateEmissions(data);
    setCalculation(result);
    setStep(3);
  };

  const saveTicket = async (paid: boolean) => {
    if (!calculation || !ticketData || !agent) return;
    setIsSaving(true);
    try {
      const flight = flightForm.getValues();
      const travelClassMap: Record<string, string> = { economy: 'Economy', premium_economy: 'Premium Economy', business: 'Business', first: 'First' };

      const { error } = await supabase.from('agent_tickets').insert({
        agent_id: agent.id,
        staff_name: ticketData.staffName,
        department: ticketData.department,
        lpo_number: ticketData.lpoNumber,
        pnr_number: ticketData.pnrNumber,
        ticket_number: ticketData.ticketNumber,
        ticket_issue_date: format(ticketData.ticketIssueDate, "yyyy-MM-dd"),
        origin_airport: flight.originAirport,
        destination_airport: flight.destinationAirport,
        travel_class: travelClassMap[flight.travelClass],
        is_return: flight.tripType === "return",
        from_date: format(flight.fromDate, "yyyy-MM-dd"),
        to_date: flight.toDate ? format(flight.toDate, "yyyy-MM-dd") : null,
        num_travelers: flight.numTravelers,
        flight_co2: calculation.flightCO2,
        accommodation_co2: calculation.accommodationCO2,
        accommodation_type: flight.accommodationType === 'none' ? null : ACCOMMODATION_LABELS[flight.accommodationType],
        total_co2: calculation.totalCO2,
        trees_needed: calculation.treesNeeded,
        trees_planted: paid ? calculation.treesNeeded : 0,
        tree_status: paid ? 'Planted' : 'Not Planted',
        offset_amount_paid: paid ? calculation.treesNeeded * COST_PER_TREE_KES : 0,
        payment_date: paid ? new Date().toISOString() : null,
      });

      if (error) throw error;

      toast({
        title: paid ? "Trees Planted!" : "Trip Saved",
        description: paid
          ? `Successfully offset ${calculation.treesNeeded} trees for ${ticketData.staffName}'s travel.`
          : `Trip saved for ${ticketData.staffName}. You can pay and plant trees later.`,
      });
      navigate("/agent/tickets");
    } catch (error) {
      console.error("Error saving ticket:", error);
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calculate & Offset</h1>
            <p className="text-muted-foreground">Enter ticket details, calculate emissions, and offset carbon</p>
          </div>
          <img src={ktbLogo} alt="Kenya Tourism Board" className="h-16 object-contain" />
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { num: 1, label: "Ticket Details" },
            { num: 2, label: "Flight Details" },
            { num: 3, label: "Results & Payment" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span className={cn("text-sm hidden sm:inline", step >= s.num ? "text-foreground font-medium" : "text-muted-foreground")}>{s.label}</span>
              {i < 2 && <div className={cn("flex-1 h-0.5", step > s.num ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>

        {/* Step 1: Ticket Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
              <CardDescription>Enter the ticket details for the government staff travel</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...ticketForm}>
                <form onSubmit={ticketForm.handleSubmit(onTicketSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={ticketForm.control} name="staffName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Staff Name *</FormLabel>
                        <FormControl><Input placeholder="Full name of traveler" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={ticketForm.control} name="department" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department *</FormLabel>
                        <FormControl><Input {...field} readOnly disabled className="bg-muted cursor-not-allowed" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={ticketForm.control} name="pnrNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>PNR Number *</FormLabel>
                        <FormControl><Input placeholder="e.g. ABC123" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={ticketForm.control} name="ticketNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticket Number *</FormLabel>
                        <FormControl><Input placeholder="e.g. 706-1234567890" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={ticketForm.control} name="ticketIssueDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Ticket Issue *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : "Select date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={ticketForm.control} name="lpoNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>LPO Number *</FormLabel>
                        <FormControl><Input placeholder="Local Purchase Order number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit">
                      Next: Flight Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Flight Details (Carbon Calculator) */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Flight & Travel Details</CardTitle>
              <CardDescription>Calculate carbon emissions for {ticketData?.staffName}'s travel</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...flightForm}>
                <form onSubmit={flightForm.handleSubmit(onFlightSubmit)} className="space-y-6">
                  {/* Trip Type */}
                  <FormField control={flightForm.control} name="tripType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Type</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="return" id="return" />
                            <Label htmlFor="return" className="cursor-pointer">Return</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="oneway" id="oneway" />
                            <Label htmlFor="oneway" className="cursor-pointer">One way</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )} />

                  {/* Airports */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={flightForm.control} name="originAirport" render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Airport *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select departure" /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {airports.map(a => (
                              <SelectItem key={a.code} value={a.code}>{a.code} - {a.city}, {a.country}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={flightForm.control} name="destinationAirport" render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Airport *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select arrival" /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {airports.map(a => (
                              <SelectItem key={a.code} value={a.code}>{a.code} - {a.city}, {a.country}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Travel Class & Travelers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={flightForm.control} name="travelClass" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Travel Class</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TRAVEL_CLASS_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={flightForm.control} name="numTravelers" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Travelers</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={20} {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={flightForm.control} name="fromDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Travel Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : "Select date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={flightForm.control} name="toDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : "Select date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )} />
                  </div>

                  {/* Accommodation */}
                  <FormField control={flightForm.control} name="accommodationType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accommodation Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(ACCOMMODATION_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="submit">
                      Calculate Emissions <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Results & Payment */}
        {step === 3 && calculation && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Carbon Emission Results</CardTitle>
                <CardDescription>For {ticketData?.staffName} ({ticketData?.department}) — Ticket #{ticketData?.ticketNumber}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Distance</p>
                    <p className="text-2xl font-bold">{Math.round(calculation.distance).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">km</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Flight CO₂</p>
                    <p className="text-2xl font-bold">{Math.round(calculation.flightCO2).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">kg CO₂</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total CO₂</p>
                    <p className="text-2xl font-bold text-destructive">{Math.round(calculation.totalCO2).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">kg CO₂</p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Trees Needed</p>
                    <p className="text-2xl font-bold text-primary">{calculation.treesNeeded}</p>
                    <p className="text-xs text-muted-foreground">to offset</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Ticket Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Staff:</span> {ticketData?.staffName}</div>
                    <div><span className="text-muted-foreground">Department:</span> {ticketData?.department}</div>
                    <div><span className="text-muted-foreground">PNR:</span> {ticketData?.pnrNumber}</div>
                    <div><span className="text-muted-foreground">Ticket #:</span> {ticketData?.ticketNumber}</div>
                    <div><span className="text-muted-foreground">LPO:</span> {ticketData?.lpoNumber}</div>
                    <div><span className="text-muted-foreground">Offset Cost:</span> KES {(calculation.treesNeeded * COST_PER_TREE_KES).toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => saveTicket(false)} disabled={isSaving}>
                  Save for Later
                </Button>
                <Button onClick={() => saveTicket(true)} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                  <TreePine className="mr-2 h-4 w-4" />
                  Pay KES {(calculation.treesNeeded * COST_PER_TREE_KES).toLocaleString()} & Plant Trees
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
