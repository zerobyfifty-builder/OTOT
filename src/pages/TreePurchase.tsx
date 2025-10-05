import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Leaf, Info, Heart, MapPin, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { generateTreeCertificate, downloadCertificate } from "@/utils/certificateGenerator";
import { SocialShare } from "@/components/certificates/SocialShare";

interface Lodge {
  id: string;
  name: string;
  location: string;
}

export const TreePurchase = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { treesNeeded = 1, totalCO2 = 0, tripData, tripId } = location.state || {};
  
  const [selectedOption, setSelectedOption] = useState<"onetime" | "subscription" | "custom">("onetime");
  const [customTreeCount, setCustomTreeCount] = useState(treesNeeded);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [selectedLodge, setSelectedLodge] = useState<string>("");
  const [dedicateTo, setDedicateTo] = useState("");
  const [isDedicated, setIsDedicated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [subscriptionMonths, setSubscriptionMonths] = useState(3);

  const PRICE_PER_TREE = 4.5;

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
        return (treesNeeded * PRICE_PER_TREE) / subscriptionMonths;
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
        return treesNeeded;
      case "custom":
        return customTreeCount;
      default:
        return 0;
    }
  };

  const getTreeCreditPercentage = () => {
    if (selectedOption !== "custom") return 100;
    return Math.round((customTreeCount / treesNeeded) * 100);
  };

  const getTreeDebtPercentage = () => {
    return 100 - getTreeCreditPercentage();
  };

  const getProgressBarColor = () => {
    const percentage = getTreeCreditPercentage();
    if (percentage <= 30) return "bg-red-500";
    if (percentage <= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getMotivationalMessage = () => {
    const percentage = getTreeCreditPercentage();
    if (percentage === 100) {
      return "Amazing! You've fully offset your flight emissions. 🌍💚";
    }
    if (percentage >= 80) {
      return `Almost there! Just ${treesNeeded - customTreeCount} more ${treesNeeded - customTreeCount === 1 ? 'tree' : 'trees'} to reach full offset.`;
    }
    if (percentage >= 50) {
      return `Great progress! You're ${percentage}% of the way to offsetting your emissions.`;
    }
    if (percentage >= 30) {
      return `Good start! You're ${percentage}% of the way to offsetting your emissions.`;
    }
    return `Great start! You're ${percentage}% of the way to offsetting your emissions.`;
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase trees.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Get user details
      const { data: userData } = await supabase
        .from('users')
        .select('email, otot_id')
        .eq('user_id', user.id)
        .single();

      if (!userData?.otot_id) {
        // Generate OTOT ID if not exists
        const ototId = `OTOT-${Date.now()}-${user.id.substring(0, 8)}`;
        await supabase
          .from('users')
          .update({ otot_id: ototId })
          .eq('user_id', user.id);
        userData.otot_id = ototId;
      }

      // Get selected lodge info if any
      let locationName = undefined;
      if (selectedLodge) {
        const lodge = lodges.find(l => l.id === selectedLodge);
        if (lodge) locationName = lodge.name;
      }

      // Generate and download certificate
      const treeCount = getTreeCount();
      const certificateBlob = await generateTreeCertificate({
        userName: userData?.email || 'Environmental Supporter',
        userId: user.id,
        numTrees: treeCount,
        co2Offset: totalCO2,
        ototId: userData.otot_id,
        location: locationName,
      });

      downloadCertificate(certificateBlob, `tree-planting-certificate-${treeCount}-trees.pdf`);

      // Save tree records to database
      const treeRecords = [];
      for (let i = 0; i < treeCount; i++) {
        treeRecords.push({
          user_id: user.id,
          otot_id: userData.otot_id,
          num_trees: 1,
          purchase_type: selectedOption === "subscription" ? "Subscription" : selectedOption === "custom" ? "Custom" : "One-time",
          amount_paid: PRICE_PER_TREE,
          status: "Waiting to be Assigned",
          lodge_id: selectedLodge || null,
          location_name: locationName,
          trip_id: tripId || null, // Link to trip if available
        });
      }

      const { error: treeError } = await supabase
        .from('trees')
        .insert(treeRecords);

      if (treeError) {
        console.error('Error saving trees:', treeError);
        throw treeError;
      }

      console.log(`Successfully saved ${treeCount} tree records to database`);

      // Show success card
      setShowSuccessCard(true);
      
      toast({
        title: "Success!",
        description: "Trees planted and certificate downloaded! Share your impact with others.",
      });

      // TODO: Integrate with Stripe for actual payment
      // For now, just show success
    } catch (error) {
      console.error('Error processing purchase:', error);
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

  if (showSuccessCard) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl py-8">
          <Card className="border-primary/20 bg-gradient-primary text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl mb-4">🎉 Thank You!</CardTitle>
              <CardDescription className="text-white/90 text-lg">
                You've successfully planted {getTreeCount()} {getTreeCount() === 1 ? 'tree' : 'trees'}!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white/10 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Trees Planted:</span>
                  <span className="text-2xl font-bold">{getTreeCount()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80">CO₂ Offset:</span>
                  <span className="text-2xl font-bold">{totalCO2.toFixed(2)} kg</span>
                </div>
              </div>

              <SocialShare type="tree" numTrees={getTreeCount()} />

              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => navigate('/my-trees')}
                >
                  View My Trees
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
                      ${(treesNeeded * PRICE_PER_TREE).toFixed(2)}
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
                  <CardDescription>Complete payment within 1 year</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="py-4 space-y-4">
                    <div>
                      <p className="text-3xl font-bold text-accent">
                        ${calculatePrice().toFixed(2)}/mo
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        for {subscriptionMonths} {subscriptionMonths === 1 ? 'month' : 'months'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Total: ${(treesNeeded * PRICE_PER_TREE).toFixed(2)} over {subscriptionMonths} {subscriptionMonths === 1 ? 'month' : 'months'}
                      </p>
                    </div>
                    
                    {selectedOption === "subscription" && (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Select Duration (Months)</Label>
                          <span className="text-sm font-semibold">{subscriptionMonths} {subscriptionMonths === 1 ? 'Month' : 'Months'}</span>
                        </div>
                        <Slider
                          min={1}
                          max={12}
                          step={1}
                          value={[subscriptionMonths]}
                          onValueChange={(vals) => setSubscriptionMonths(vals[0])}
                          className="[&_[role=slider]]:bg-background [&_[role=slider]]:border-accent [&_[role=slider]]:border-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1 Month</span>
                          <span>12 Months</span>
                        </div>
                      </div>
                    )}
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

              {/* Option 3: Flexible Tree Planting */}
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
                  <CardTitle className="text-xl">Flexible Tree Planting</CardTitle>
                  <CardDescription>Choose your own tree quantity</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="py-4">
                    <p className="text-3xl font-bold text-foreground">
                      ${(customTreeCount * PRICE_PER_TREE).toFixed(2)}
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
                          max={treesNeeded}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1 Tree</span>
                          <span>{treesNeeded} Trees</span>
                        </div>
                      </div>
                      
                      {/* Progress Bar and Stats */}
                      <div className="space-y-3 pt-2">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600 font-medium">Tree Credit: {getTreeCreditPercentage()}%</span>
                            <span className="text-muted-foreground">Tree Debt: {getTreeDebtPercentage()}%</span>
                          </div>
                          <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
                              style={{ width: `${getTreeCreditPercentage()}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Motivational Message */}
                        <div className="bg-accent/10 rounded-lg p-3">
                          <p className="text-sm text-foreground font-medium text-center">
                            {getMotivationalMessage()}
                          </p>
                        </div>
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
                    {selectedOption === "subscription" && ` over ${subscriptionMonths} months`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-primary">
                    ${calculatePrice().toFixed(2)}
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
