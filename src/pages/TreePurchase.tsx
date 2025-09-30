import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Leaf, Info, Heart, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

interface Lodge {
  id: string;
  name: string;
  location: string;
}

export const TreePurchase = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { treesNeeded = 1, totalCO2 = 0, tripData } = location.state || {};
  
  const [selectedOption, setSelectedOption] = useState<"onetime" | "subscription" | "custom">("onetime");
  const [customTreeCount, setCustomTreeCount] = useState(treesNeeded);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [selectedLodge, setSelectedLodge] = useState<string>("");
  const [dedicateTo, setDedicateTo] = useState("");
  const [isDedicated, setIsDedicated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const PRICE_PER_TREE = 30;

  useEffect(() => {
    fetchLodges();
  }, []);

  const fetchLodges = async () => {
    try {
      const { data, error } = await supabase
        .from("lodges")
        .select("id, name, location")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setLodges(data || []);
    } catch (error) {
      console.error("Error fetching lodges:", error);
    }
  };

  const calculatePrice = () => {
    switch (selectedOption) {
      case "onetime":
        return treesNeeded * PRICE_PER_TREE;
      case "subscription":
        return PRICE_PER_TREE;
      case "custom":
        return customTreeCount * PRICE_PER_TREE;
      default:
        return 0;
    }
  };

  const getTreeCount = () => {
    switch (selectedOption) {
      case "onetime":
        return treesNeeded;
      case "subscription":
        return 1;
      case "custom":
        return customTreeCount;
      default:
        return 0;
    }
  };

  const handlePurchase = async () => {
    setIsProcessing(true);
    
    try {
      // TODO: Integrate with Stripe
      // For now, show a reminder toast
      toast({
        title: "Stripe Integration Pending",
        description: "Payment processing will be implemented with Stripe integration.",
      });
      
      // Navigate to a placeholder confirmation page
      // navigate("/payment-success");
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!treesNeeded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Trip Data</CardTitle>
            <CardDescription>
              Please calculate your carbon footprint first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/carbon-calculator")} className="w-full">
              Go to Carbon Calculator
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container max-w-5xl py-8">
          {/* Page Header with Trip Summary */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Plant Your Trees
            </h1>
            <p className="text-muted-foreground mb-6">
              Choose how you'd like to offset your carbon footprint
            </p>

            {/* Trip Summary Card */}
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total CO₂ Emissions</p>
                      <p className="text-2xl font-bold text-foreground">
                        {totalCO2.toFixed(2)} kg
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trees Needed</p>
                      <p className="text-2xl font-bold text-foreground">
                        {treesNeeded} {treesNeeded === 1 ? "Tree" : "Trees"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Options */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold text-foreground">Choose Your Option</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Option 1: One-time Purchase - Most Prominent */}
              <Card
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedOption === "onetime"
                    ? "ring-2 ring-primary shadow-lg scale-105"
                    : "hover:scale-102"
                }`}
                onClick={() => setSelectedOption("onetime")}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                    <Leaf className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Plant All Trees Now</CardTitle>
                  <CardDescription>Make a one-time contribution</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="py-4">
                    <p className="text-3xl font-bold text-primary">
                      ${treesNeeded * PRICE_PER_TREE}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Plant {treesNeeded} {treesNeeded === 1 ? "tree" : "trees"} now
                    </p>
                  </div>
                  <Button
                    variant={selectedOption === "onetime" ? "default" : "outline"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOption("onetime");
                    }}
                  >
                    {selectedOption === "onetime" ? "Selected" : "Select"}
                  </Button>
                </CardContent>
              </Card>

              {/* Option 2: Monthly Subscription */}
              <Card
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedOption === "subscription"
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:scale-102"
                }`}
                onClick={() => setSelectedOption("subscription")}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                    <Leaf className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="text-xl">Monthly Tree Planting</CardTitle>
                  <CardDescription>Subscribe to plant trees monthly</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="py-4">
                    <p className="text-3xl font-bold text-accent">
                      ${PRICE_PER_TREE}/mo
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      for {treesNeeded} months
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total: ${treesNeeded * PRICE_PER_TREE} over {treesNeeded} months
                    </p>
                  </div>
                  <Button
                    variant={selectedOption === "subscription" ? "default" : "outline"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOption("subscription");
                    }}
                  >
                    {selectedOption === "subscription" ? "Selected" : "Select"}
                  </Button>
                </CardContent>
              </Card>

              {/* Option 3: Custom Amount */}
              <Card
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedOption === "custom"
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:scale-102"
                }`}
                onClick={() => setSelectedOption("custom")}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                    <Leaf className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="text-xl">Custom Contribution</CardTitle>
                  <CardDescription>Choose your own tree quantity</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="py-4">
                    <p className="text-3xl font-bold text-foreground">
                      ${customTreeCount * PRICE_PER_TREE}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      for {customTreeCount} {customTreeCount === 1 ? "tree" : "trees"}
                    </p>
                  </div>
                  
                  {selectedOption === "custom" && (
                    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-2">
                        <Label>Number of Trees: {customTreeCount}</Label>
                        <Slider
                          value={[customTreeCount]}
                          onValueChange={(value) => setCustomTreeCount(value[0])}
                          min={1}
                          max={Math.max(treesNeeded * 3, 50)}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant={selectedOption === "custom" ? "default" : "outline"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOption("custom");
                    }}
                  >
                    {selectedOption === "custom" ? "Selected" : "Select"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Additional Options */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">Additional Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lodge Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Select Lodge (Optional)
                </Label>
                <Select value={selectedLodge} onValueChange={setSelectedLodge}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a lodge for your trees" />
                  </SelectTrigger>
                  <SelectContent>
                    {lodges.map((lodge) => (
                      <SelectItem key={lodge.id} value={lodge.id}>
                        {lodge.name} - {lodge.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dedicate Trees */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dedicate"
                    checked={isDedicated}
                    onCheckedChange={(checked) => setIsDedicated(checked as boolean)}
                  />
                  <Label
                    htmlFor="dedicate"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Heart className="h-4 w-4 text-destructive" />
                    Dedicate trees to someone special
                  </Label>
                </div>
                
                {isDedicated && (
                  <Input
                    placeholder="Enter name or message"
                    value={dedicateTo}
                    onChange={(e) => setDedicateTo(e.target.value)}
                    className="max-w-md"
                  />
                )}
              </div>

              {/* Why $30 Info */}
              <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-5 w-5 text-primary cursor-help mt-0.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-2">Why $30 per tree?</p>
                    <ul className="text-sm space-y-1">
                      <li>• Seedling and planting: $10</li>
                      <li>• Land preparation: $5</li>
                      <li>• Maintenance (5 years): $10</li>
                      <li>• Monitoring and reporting: $5</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Why $30 per tree?</p>
                  <p className="text-sm text-muted-foreground">
                    Your contribution covers planting, maintenance, and monitoring for 5 years. Hover over the icon for details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Summary and Checkout */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    Total Amount
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {getTreeCount()} {getTreeCount() === 1 ? "tree" : "trees"}
                    {selectedOption === "subscription" && ` × ${treesNeeded} months`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-primary">
                    ${calculatePrice()}
                  </p>
                  {selectedOption === "subscription" && (
                    <p className="text-sm text-muted-foreground">per month</p>
                  )}
                </div>
              </div>

              <Button
                size="lg"
                className="w-full text-lg"
                onClick={handlePurchase}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Proceed to Payment"}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Secure payment powered by Stripe (integration pending)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
};
