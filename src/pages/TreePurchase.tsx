import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Leaf, Info, Heart, MapPin, Download, Share2, Facebook, Twitter, Linkedin, Instagram, Copy, Trees, X, Award, CircleDollarSign } from "lucide-react";
import { CertificatePreviewDialog, CertificatePreviewFile } from "@/components/certificates/CertificatePreviewDialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { generateTreeCertificate, downloadCertificate } from "@/utils/certificateGenerator";
import mauForestImage from "@/assets/mau-forest-complex.jpg";
import { useActivePlantingConfig } from "@/hooks/useActivePlantingConfig";
import { useVisibleTiers, type ContributionTier } from "@/hooks/useContributionTiers";
import { computeTierPrice } from "@/hooks/useTierPrice";
import { MoreWaysToContribute } from "@/components/tourist/MoreWaysToContribute";
import { useTouristPlantingLocation } from "@/hooks/useActivePlantingLocation";

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
  
  const { 
    treesNeeded = 1, totalCO2 = 0, tripData, tripId,
    donationUSDPerTree: routeDonation,
    sliderMax: routeSliderMax,
    treeCreditPct: routeTreeCreditPct,
    treeDebtPct: routeTreeDebtPct,
    treesPlantedPrior: routePlantedPrior,
    treesCommittedPrior: routeCommittedPrior,
    speciesLabel, rateUsed, speciesId, survivalRate, horizonYears, configId,
  } = location.state || {};
  const [treesPlanted, setTreesPlanted] = useState(routePlantedPrior || 0);
  const { data: plantingLocation } = useTouristPlantingLocation();
  
  // Default to "custom" (flexible) option
  const [selectedOption, setSelectedOption] = useState<"onetime" | "subscription" | "custom" | "tier">("custom");
  const [selectedTier, setSelectedTier] = useState<ContributionTier | null>(null);
  
  // Calculate min and max months based on trees needed
  const getMonthlyBounds = () => {
    const minMonths = Math.ceil(treesNeeded / 12);
    const maxMonths = Math.min(treesNeeded, 12);
    return { minMonths, maxMonths };
  };
  
  const { minMonths, maxMonths } = getMonthlyBounds();
  const [subscriptionMonths, setSubscriptionMonths] = useState(Math.min(3, maxMonths));
  // Default the flexible slider to the full trees needed for this trip so the
  // thumb starts on the right end. User can drag down to choose fewer trees.
  const [customTreeCount, setCustomTreeCount] = useState(Math.max(1, treesNeeded));
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [selectedLodge, setSelectedLodge] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Card");
  const [isDedicated, setIsDedicated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [certificateBlob, setCertificateBlob] = useState<Blob | null>(null);
  const [previewCert, setPreviewCert] = useState<CertificatePreviewFile | null>(null);

  // Dedication modal state
  const [showDedicationModal, setShowDedicationModal] = useState(false);
  const [dedicationName, setDedicationName] = useState("");
  const [dedicationEmail, setDedicationEmail] = useState("");
  const [dedicationMessage, setDedicationMessage] = useState("");

  // Reset subscription months when deselecting monthly option
  const handleOptionChange = (option: "onetime" | "subscription" | "custom" | "tier") => {
    if (selectedOption === "subscription" && option !== "subscription") {
      setSubscriptionMonths(3);
    }
    if (option === "custom") {
      setCustomTreeCount(Math.max(1, treesNeeded));
    }
    if (option !== "tier") {
      setSelectedTier(null);
    }
    setSelectedOption(option);
  };

  const handleTierSelect = (tier: ContributionTier) => {
    setSelectedTier(tier);
    setSelectedOption("tier");
  };

  // Live per-tree price from active Planting Costs config (Super Admin → Configuration).
  // Falls back to the value passed via router state, then to a safe default.
  const { pricePerTree: PRICE_PER_TREE, configId: activeConfigId } = useActivePlantingConfig({
    fallbackPricePerTree: routeDonation,
  });

  useEffect(() => {
    fetchLodges();
    if (tripId && user) {
      fetchTreesPlanted();
    }
  }, [tripId, user]);

  // Default the flexible slider to the trip's full trees-needed value whenever
  // the user lands on this page from a trip's "Trees Offset" / "Plant More Trees"
  // CTA. This is a marketing decision: present the full impact target up-front.
  // The slider still lets the user drag down to fewer trees if they choose.
  useEffect(() => {
    if (treesNeeded > 0) {
      setCustomTreeCount(Math.max(1, treesNeeded));
    }
  }, [treesNeeded, tripId]);

  const fetchTreesPlanted = async () => {
    if (!tripId || !user) return;
    
    try {
      const { data, error } = await supabase
        .from("trees")
        .select("num_trees")
        .eq("trip_id", tripId)
        .eq("user_id", user.id);

      if (error) throw error;
      
      const total = data?.reduce((sum, tree) => sum + tree.num_trees, 0) || 0;
      setTreesPlanted(total);
    } catch (error) {
      console.error("Error fetching trees planted:", error);
    }
  };

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

  const tierPriceInfo = selectedTier ? computeTierPrice(selectedTier, PRICE_PER_TREE) : null;

  // Flexible Tree Planting card sources its per-tree price from the active
  // custom_range contribution tier (Auto $ from the planting cost config,
  // overridden by the tier's Override $ when set). Falls back to the raw
  // planting-cost per-tree when no such tier is visible for tourists.
  const { tiers: visibleTouristTiers } = useVisibleTiers('tourist');
  const flexibleTier =
    visibleTouristTiers.find((t) => t.tier_type === 'custom_range') ||
    visibleTouristTiers.find(
      (t) => t.name?.toLowerCase().includes('flexible')
    ) ||
    null;
  const monthlyTier =
    visibleTouristTiers.find(
      (t) => t.name?.toLowerCase().includes('monthly')
    ) || null;
  const flexiblePerTree = (() => {
    if (!flexibleTier || flexibleTier.price_override_usd == null) return PRICE_PER_TREE;
    const refTrees =
      flexibleTier.max_trees ?? flexibleTier.trees_count ?? flexibleTier.min_trees ?? 1;
    if (!refTrees || refTrees <= 0) return PRICE_PER_TREE;
    return Number(flexibleTier.price_override_usd) / refTrees;
  })();
  const monthlyPerTree = (() => {
    if (!monthlyTier || monthlyTier.price_override_usd == null) return PRICE_PER_TREE;
    const refTrees =
      monthlyTier.trees_count ?? monthlyTier.max_trees ?? monthlyTier.min_trees ?? 1;
    if (!refTrees || refTrees <= 0) return PRICE_PER_TREE;
    return Number(monthlyTier.price_override_usd) / refTrees;
  })();
  const excludedTierIds = [flexibleTier?.id, monthlyTier?.id].filter(Boolean) as string[];

  const calculatePrice = () => {
    if (selectedOption === "tier" && tierPriceInfo) return tierPriceInfo.finalPrice;
    switch (selectedOption) {
      case "onetime":
        return treesNeeded * PRICE_PER_TREE;
      case "subscription":
        return (treesNeeded * monthlyPerTree) / subscriptionMonths;
      case "custom":
        return customTreeCount * flexiblePerTree;
      default:
        return 0;
    }
  };

  const calculateMonthlyPrice = () => {
    return (treesNeeded * monthlyPerTree) / subscriptionMonths;
  };


  const getTreeCount = () => {
    if (selectedOption === "tier" && tierPriceInfo) return tierPriceInfo.trees;
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

  const getTreesCommitted = () => {
    if (selectedOption === "tier" && tierPriceInfo) return tierPriceInfo.trees;
    switch (selectedOption) {
      case "onetime":
      case "subscription":
        return Math.max(0, treesNeeded - treesPlanted);
      case "custom":
        return customTreeCount;
      default:
        return 0;
    }
  };

  const getTreeCreditPercentage = () => {
    const totalProgress = treesPlanted + getTreesCommitted();
    return Math.round((totalProgress / treesNeeded) * 100);
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
      return `Almost there! Just ${treesNeeded - customTreeCount} more to reach full offset.`;
    }
    if (percentage >= 50) {
      return `Great progress! You're ${percentage}% of the way to offsetting your emissions.`;
    }
    if (percentage >= 30) {
      return `Good start! You're ${percentage}% of the way to offsetting your emissions.`;
    }
    return `Great start! You're ${percentage}% of the way to offsetting your emissions.`;
  };

  const handleDedicationCheckChange = (checked: boolean) => {
    if (checked) {
      setShowDedicationModal(true);
    } else {
      setIsDedicated(false);
      setDedicationName("");
      setDedicationEmail("");
      setDedicationMessage("");
    }
  };

  const handleDedicationSave = () => {
    if (!dedicationName.trim() || !dedicationEmail.trim()) {
      toast({
        title: "Required Fields",
        description: "Please enter the recipient's name and email.",
        variant: "destructive",
      });
      return;
    }
    setIsDedicated(true);
    setShowDedicationModal(false);
    toast({
      title: "Dedication Saved",
      description: `Trees will be dedicated to ${dedicationName}.`,
    });
  };

  const handleDedicationCancel = () => {
    setShowDedicationModal(false);
    if (!isDedicated) {
      setDedicationName("");
      setDedicationEmail("");
      setDedicationMessage("");
    }
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
      const { data: userData } = await supabase
        .from('users')
        .select('email, otot_id')
        .eq('user_id', user.id)
        .single();

      if (!userData?.otot_id) {
        const ototId = `OTOT-${Date.now()}-${user.id.substring(0, 8)}`;
        const { error: updateError } = await supabase
          .from('users')
          .update({ otot_id: ototId })
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error('Error updating OTOT ID:', updateError);
          throw new Error('Failed to generate user ID. Please try again.');
        }
        userData.otot_id = ototId;
      }

      const locationName = "Kenya Forest Service (KFS)";

      const treeCount = getTreeCount();
      const totalCost = calculatePrice();
      const paymentReference = `SIMULATED-${Date.now()}`;

      // Phase 3: write to the tourist_purchases domain table only.
      // A SECURITY DEFINER trigger mirrors this row into contribution_tracking
      // (issuing the canonical CTR-NNNNN) and creates the per-tree records in `trees`.
      const { error: purchaseError } = await supabase
        .from('tourist_purchases' as any)
        .insert({
          user_id: user.id,
          trip_id: tripId || null,
          num_trees: treeCount,
          total_cost_usd: totalCost,
          price_per_tree_usd: PRICE_PER_TREE,
          purchase_type: selectedOption === "subscription" ? "Subscription" : "One-time",
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          location_name: locationName,
          is_dedicated: isDedicated,
          dedication_name: isDedicated ? dedicationName : null,
          dedication_email: isDedicated ? dedicationEmail : null,
          dedication_message: isDedicated ? dedicationMessage : null,
        } as any);

      if (purchaseError) {
        console.error('Error saving tourist purchase:', purchaseError);
        throw new Error(`Failed to save tree purchase: ${purchaseError.message || 'Database error'}`);
      }

      console.log(`Successfully recorded purchase of ${treeCount} tree(s) with payment reference: ${paymentReference}`);


      // Generate certificate - use dedication name if dedicated
      const certificateRecipient = isDedicated && dedicationName 
        ? dedicationName 
        : userData?.email || 'Environmental Supporter';

      const generatedCert = await generateTreeCertificate({
        userName: certificateRecipient,
        userId: user.id,
        numTrees: treeCount,
        co2Offset: totalCO2,
        ototId: userData.otot_id,
        location: locationName,
      });

      setCertificateBlob(generatedCert);

      // If dedicated, log that an email should be sent to the recipient
      if (isDedicated && dedicationEmail) {
        console.log(`Certificate should be emailed to: ${dedicationEmail} for ${dedicationName}`);
        // TODO: Integrate with email backend to send certificate to dedicationEmail
      }

      sessionStorage.removeItem('carbon_calculator_flow_active');
      
      setShowSuccessCard(true);
      
      toast({
        title: "Success!",
        description: `Payment successful! ${treeCount} purchased for $${totalCost.toFixed(2)}.`,
      });

    } catch (error: any) {
      console.error('Error processing purchase:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to complete purchase. Please try again.",
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
    const message = `I planted ${getTreeCount()} in Kenya through One Tourist One Tree! 🌳 Join me in making tourism sustainable. #OneTouristOneTree #SustainableTravel #Kenya`;
    const shareUrl = window.location.origin;

    const shareOnFacebook = () => {
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'width=600,height=400');
    };

    const shareOnTwitter = () => {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(url, '_blank', 'width=600,height=400');
    };

    const shareOnLinkedIn = () => {
      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
      window.open(url, '_blank', 'width=600,height=400');
    };

    const copyInstagramMessage = () => {
      navigator.clipboard.writeText(message);
      toast({
        title: "Message copied!",
        description: "Paste it on Instagram with your certificate screenshot.",
      });
    };

    const copyLink = () => {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Share this link with your friends.",
      });
    };

    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl py-12 px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-50 border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-4xl font-bold mb-2 flex items-center justify-center gap-2 text-foreground">
                  🎉 Thank You!
                </CardTitle>
                <CardDescription className="text-muted-foreground text-lg">
                  You've successfully planted {getTreeCount()}!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between text-lg">
                    <span className="text-muted-foreground">Trees Planted:</span>
                    <span className="text-5xl font-bold text-primary">{getTreeCount()}</span>
                  </div>
                  <div className="flex items-center justify-between text-lg">
                    <span className="text-muted-foreground">CO₂ Offset:</span>
                    <span className="text-3xl font-bold text-primary">{totalCO2.toFixed(2)} kg</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="default" 
                    size="lg"
                    className="flex-1 text-lg py-6"
                    onClick={() => navigate('/my-trees')}
                  >
                    View my Trees
                  </Button>
                  {certificateBlob && (
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="flex-1 text-lg py-6 gap-2"
                      onClick={() => {
                        setPreviewCert({
                          blob: certificateBlob,
                          name: `tree-planting-certificate-${getTreeCount()}-trees.pdf`,
                        });
                      }}
                    >
                      <Award className="h-5 w-5" />
                      View Certificate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary text-foreground border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <Share2 className="h-8 w-8 text-foreground" />
                  Share Your Impact
                </CardTitle>
                <CardDescription className="text-foreground/70 text-base">
                  Inspire others to take action for sustainable tourism
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-primary/60 rounded-lg p-4">
                  <p className="text-sm text-foreground/70 mb-2">Share message:</p>
                  <p className="text-sm font-medium text-foreground">{message}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="lg" className="w-full gap-2 bg-white hover:bg-white/90 text-foreground border-0" onClick={shareOnFacebook}>
                    <Facebook className="h-5 w-5" /> Facebook
                  </Button>
                  <Button variant="outline" size="lg" className="w-full gap-2 bg-white hover:bg-white/90 text-foreground border-0" onClick={shareOnTwitter}>
                    <Twitter className="h-5 w-5" /> Twitter
                  </Button>
                  <Button variant="outline" size="lg" className="w-full gap-2 bg-white hover:bg-white/90 text-foreground border-0" onClick={shareOnLinkedIn}>
                    <Linkedin className="h-5 w-5" /> LinkedIn
                  </Button>
                  <Button variant="outline" size="lg" className="w-full gap-2 bg-white hover:bg-white/90 text-foreground border-0" onClick={copyInstagramMessage}>
                    <Instagram className="h-5 w-5" /> Instagram
                  </Button>
                  <Button variant="outline" size="lg" className="w-full col-span-2 gap-2 bg-white hover:bg-white/90 text-foreground border-0" onClick={copyLink}>
                    <Copy className="h-5 w-5" /> Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Certificate Preview Modal */}
        <CertificatePreviewDialog
          previewCert={previewCert}
          onClose={() => setPreviewCert(null)}
          onDownload={(cert) => downloadCertificate(cert.blob, cert.name)}
        />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="tourist-dashboard-glass tree-purchase-glass min-h-screen">
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
            <section className="glass-card glass-card--featured relative py-8 px-4 sm:py-10 sm:px-6 md:py-12 md:px-8 rounded-2xl sm:rounded-3xl overflow-hidden">
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-10 right-20 w-64 h-64 rounded-full border-2 border-foreground"></div>
                <div className="absolute bottom-10 left-20 w-48 h-48 rounded-full border-2 border-foreground"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-foreground"></div>
              </div>
              <div className="relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total CO₂ Emissions</p>
                      <p className="text-2xl font-bold text-foreground">{totalCO2.toFixed(2)} kg</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trees Needed</p>
                      <p className="text-2xl font-bold text-foreground">{treesNeeded}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trees Planted</p>
                      <p className="text-2xl font-bold text-foreground">{treesPlanted}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Leaf className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Trees Committed</p>
                      <p className="text-2xl font-bold text-foreground">{getTreesCommitted()}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar Section */}
                <div className="space-y-2 pt-4 border-t border-accent/20">
                  <div className="flex justify-between items-center text-sm">
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
              </div>
            </section>
          </div>

          {/* Purchase Options */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-semibold text-foreground">Choose Your Option</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option 1: Flexible Tree Planting - Default & most prominent */}
              <Card
                className={`transition-all duration-300 hover:shadow-lg ${
                  selectedOption === "custom"
                    ? "ring-2 ring-primary shadow-lg scale-105"
                    : ""
                }`}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                    <Leaf className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{flexibleTier?.name || "Flexible Tree Planting"}</CardTitle>
                  <CardDescription>{flexibleTier?.key || "Select number of trees"}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="py-4">
                    <p className="text-3xl font-bold text-primary">
                      ${(customTreeCount * flexiblePerTree).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      for {customTreeCount}
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
                          max={Math.max(1, treesNeeded)}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1</span>
                          <span>{Math.max(1, treesNeeded)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant={selectedOption === "custom" ? "default" : "outline"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionChange("custom");
                    }}
                  >
                    {selectedOption === "custom" ? "Selected" : "Select"}
                  </Button>
                </CardContent>
              </Card>

              {/* Option 2: Monthly Subscription */}
              <Card
                className={`transition-all duration-300 hover:shadow-lg ${
                  selectedOption === "subscription"
                    ? "ring-2 ring-primary shadow-lg"
                    : ""
                }`}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
                    <Leaf className="h-8 w-8 text-accent" />
                  </div>
                  <CardTitle className="text-xl">{monthlyTier?.name || "Monthly Tree Planting"}</CardTitle>
                  <CardDescription>{monthlyTier?.key || "Complete payment within 1 year"}</CardDescription>

                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="py-4 space-y-4">
                    <div>
                      <p className="text-3xl font-bold text-accent">
                        ${calculateMonthlyPrice().toFixed(2)}/mo
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        for {subscriptionMonths} {subscriptionMonths === 1 ? 'month' : 'months'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {Math.ceil(treesNeeded / subscriptionMonths)} trees per month
                      </p>
                    </div>
                    
                    {selectedOption === "subscription" && (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Select Duration (Months)</Label>
                          <span className="text-sm font-semibold">{subscriptionMonths} {subscriptionMonths === 1 ? 'Month' : 'Months'}</span>
                        </div>
                        <Slider
                          min={minMonths}
                          max={maxMonths}
                          step={1}
                          value={[subscriptionMonths]}
                          onValueChange={(vals) => setSubscriptionMonths(vals[0])}
                          className="[&_[role=slider]]:bg-background [&_[role=slider]]:border-accent [&_[role=slider]]:border-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{minMonths}</span>
                          <span>{maxMonths}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant={selectedOption === "subscription" ? "default" : "outline"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionChange("subscription");
                    }}
                  >
                    {selectedOption === "subscription" ? "Selected" : "Select"}
                  </Button>
                </CardContent>
              </Card>
              <MoreWaysToContribute
                perTree={PRICE_PER_TREE}
                selectedTierId={selectedTier?.id || null}
                onSelectTier={handleTierSelect}
                excludedTierIds={excludedTierIds}
              />
            </div>


            {/* Per-tree price info */}
            <div className="why-per-tree-info flex items-start gap-3 p-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <CircleDollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="why-per-tree-title font-semibold text-sm">Why ${PRICE_PER_TREE.toFixed(2)} per tree?</p>
                <p className="why-per-tree-desc text-sm">
                  Your contribution covers seedling, planting labour, 3 years of aftercare, MRV/GPS geotagging and program overhead as per the plantation partners and program administrator charges.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Options - Three Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Card 1: Planted by */}
            <Card className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trees className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Planted by</p>
                <h3 className="text-lg font-bold text-foreground">
                  {plantingLocation?.planted_by_name ?? "MFC-ICLIP"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {plantingLocation?.planted_by_description ?? "The Mau Forest Complex Integrated Conservation and Livelihood Improvement Programme, under the Ministry of Environment, Climate Change & Forestry, is a landmark 10-year initiative targeting over 317,000 hectares—one of East Africa's most ambitious landscape restoration efforts."}
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Planted here */}
            <Card className="border-border/50 hover:shadow-md transition-shadow overflow-hidden">
              <img
                src={plantingLocation?.photo_url || mauForestImage}
                alt={`${plantingLocation?.site_name ?? "Mau Forest Complex"} reforestation site`}
                className="w-full h-32 object-cover"
              />
              <CardContent className="pt-4 text-center space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Planted here</p>
                <h3 className="text-lg font-bold text-foreground inline-flex items-center gap-1 justify-center">
                  {plantingLocation?.site_name ?? "Mau Forest Complex"}
                  {plantingLocation?.gps_lat != null && plantingLocation?.gps_lng != null && (
                    <a
                      href={`https://www.google.com/maps?q=${plantingLocation.gps_lat},${plantingLocation.gps_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Open location in Google Maps"
                    >
                      <MapPin className="h-4 w-4" />
                    </a>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {plantingLocation?.site_description ?? "A vital water tower and source of 12 major rivers feeding Lake Victoria, Lake Nakuru, and the Maasai Mara -Serengeti. Your tree is planted here by MFC-ICLIP to restore this degraded landscape and regenerate the forest."}
                </p>
                {(plantingLocation?.site_url ?? "https://mfc-iclip.org/") && (
                  <a href={plantingLocation?.site_url ?? "https://mfc-iclip.org/"} target="_blank" rel="noopener noreferrer">
                    <Button variant="link" size="sm" className="text-xs text-primary p-0 h-auto">
                      Know more →
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Dedicated to */}
            <Card 
              className={`border-border/50 hover:shadow-md transition-shadow cursor-pointer ${isDedicated ? 'ring-2 ring-primary/30' : ''}`}
              onClick={() => {
                if (!isDedicated) {
                  setShowDedicationModal(true);
                }
              }}
            >
              <CardContent className="pt-6 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Heart className={`h-6 w-6 ${isDedicated ? 'text-destructive fill-destructive' : 'text-destructive'}`} />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dedicated to</p>
                
                {isDedicated ? (
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">{dedicationName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Certificate will be emailed to {dedicationEmail}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDedicationModal(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-muted-foreground">Someone special?</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Dedicate your trees as a gift. They'll receive a personalised certificate.
                    </p>
                    <Button variant="outline" size="sm" className="text-xs">
                      Add dedication
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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

              {/* Payment Method Selection */}
              <div className="mb-6 space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                  {["Card", "M-Pesa", "Bank Transfer", "PayPal"].map((method) => (
                    <button
                      type="button"
                      key={method}
                      aria-pressed={paymentMethod === method}
                      onPointerDown={() => setPaymentMethod(method)}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors touch-manipulation select-none ${
                        paymentMethod === method
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          paymentMethod === method ? "border-primary" : "border-muted-foreground"
                        }`}
                      >
                        {paymentMethod === method && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <span>{method}</span>
                    </button>
                  ))}
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

              <p
                className="tree-purchase-payment-footnote text-center mt-4"
                style={{ color: "hsl(0 0% 45%)" }}
              >
                Secure payment powered by Stripe (integration pending)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dedication Modal */}
      <Dialog open={showDedicationModal} onOpenChange={setShowDedicationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              Dedicate Your Trees
            </DialogTitle>
            <DialogDescription>
              The person you dedicate to will receive an email with a personalized certificate bearing their name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ded-name">Recipient's Name *</Label>
              <Input
                id="ded-name"
                placeholder="Enter their full name"
                value={dedicationName}
                onChange={(e) => setDedicationName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ded-email">Recipient's Email *</Label>
              <Input
                id="ded-email"
                type="email"
                placeholder="Enter their email address"
                value={dedicationEmail}
                onChange={(e) => setDedicationEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ded-message">Personal Message (Optional)</Label>
              <Textarea
                id="ded-message"
                placeholder="Write a heartfelt message..."
                value={dedicationMessage}
                onChange={(e) => setDedicationMessage(e.target.value)}
                className="min-h-[80px] resize-y"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDedicationCancel}>
              Cancel
            </Button>
            <Button onClick={handleDedicationSave}>
              Save Dedication
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default TreePurchase;
