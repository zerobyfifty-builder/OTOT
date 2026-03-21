import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Wallet, Save, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface WalletSetting {
  id: string;
  setting_key: string;
  setting_value: number;
  description: string | null;
}

export default function WalletSettings() {
  const queryClient = useQueryClient();
  const [techFee, setTechFee] = useState<string>("30");
  const [ktbFee, setKtbFee] = useState<string>("30");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["wallet-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_settings" as any)
        .select("*");
      if (error) throw error;
      return data as unknown as WalletSetting[];
    },
  });

  useEffect(() => {
    if (settings) {
      const tech = settings.find((s) => s.setting_key === "tech_partner_fee");
      const ktb = settings.find((s) => s.setting_key === "ktb_marketing_fee");
      if (tech) setTechFee(String(tech.setting_value));
      if (ktb) setKtbFee(String(ktb.setting_value));
    }
  }, [settings]);

  const techFeeNum = parseFloat(techFee) || 0;
  const ktbFeeNum = parseFloat(ktbFee) || 0;
  const plantationFee = 100 - ktbFeeNum;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (techFeeNum < 0 || techFeeNum > 100) throw new Error("Tech fee must be 0-100%");
      if (ktbFeeNum < 0 || ktbFeeNum > 100) throw new Error("KTB fee must be 0-100%");
      if (ktbFeeNum + plantationFee !== 100) throw new Error("KTB + Plantation must equal 100%");

      const updates = [
        { key: "tech_partner_fee", value: techFeeNum },
        { key: "ktb_marketing_fee", value: ktbFeeNum },
        { key: "tree_plantation_fee", value: plantationFee },
      ];

      for (const u of updates) {
        const { error } = await supabase
          .from("wallet_settings" as any)
          .update({ setting_value: u.value, updated_at: new Date().toISOString() } as any)
          .eq("setting_key", u.key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-settings"] });
      toast.success("Wallet settings saved successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save settings");
    },
  });

  // Example calculation
  const exampleContribution = 100;
  const techAmount = (exampleContribution * techFeeNum) / 100;
  const remaining = exampleContribution - techAmount;
  const ktbAmount = (remaining * ktbFeeNum) / 100;
  const plantationAmount = (remaining * plantationFee) / 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-admin-primary">Configuration</h1>
        <p className="text-muted-foreground mt-1">Manage system-level settings</p>
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 text-admin-primary">
          <Wallet className="h-5 w-5" />
          Wallet Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the fund allocation split percentage from tree planting contributions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contribution Split Configuration</CardTitle>
          <CardDescription>
            First, a platform fee is deducted from the total contribution. The remaining balance is then split between KTB and the Plantation Partner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Tech Partner Fee */}
          <div className="space-y-2">
            <Label htmlFor="tech-fee" className="font-medium">
              (1) Tech Partner Platform Dev & Maintenance Fee
            </Label>
            <p className="text-xs text-muted-foreground">
              Percentage deducted from total contribution before splitting the remainder.
            </p>
            <div className="flex items-center gap-2 max-w-xs">
              <Input
                id="tech-fee"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={techFee}
                onChange={(e) => setTechFee(e.target.value)}
                className="w-24"
              />
              <span className="text-sm font-medium text-muted-foreground">%</span>
            </div>
          </div>

          <Separator />

          <div className="bg-muted/50 rounded-lg p-4 space-y-1">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Info className="h-4 w-4 text-muted-foreground" />
              Remaining balance after tech fee: <span className="font-bold">{100 - techFeeNum}%</span> of contribution
            </p>
            <p className="text-xs text-muted-foreground">
              The remaining {100 - techFeeNum}% is split between KTB and the Plantation Partner as configured below.
            </p>
          </div>

          {/* Step 2: KTB Fee */}
          <div className="space-y-2">
            <Label htmlFor="ktb-fee" className="font-medium">
              (2) KTB Marketing Fee
            </Label>
            <p className="text-xs text-muted-foreground">
              Percentage of the remaining balance allocated to KTB.
            </p>
            <div className="flex items-center gap-2 max-w-xs">
              <Input
                id="ktb-fee"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={ktbFee}
                onChange={(e) => setKtbFee(e.target.value)}
                className="w-24"
              />
              <span className="text-sm font-medium text-muted-foreground">%</span>
            </div>
          </div>

          {/* Step 3: Auto-calculated Plantation Fee */}
          <div className="space-y-2">
            <Label className="font-medium">
              (3) Tree Plantation & Growing Fee
            </Label>
            <p className="text-xs text-muted-foreground">
              Auto-calculated as the balance of the remaining amount.
            </p>
            <div className="flex items-center gap-2 max-w-xs">
              <div className="w-24 h-10 rounded-md border border-input bg-muted flex items-center justify-center text-sm font-semibold">
                {plantationFee}%
              </div>
              <span className="text-xs text-muted-foreground italic">Auto-calculated</span>
            </div>
          </div>

          <Separator />

          {/* Example Calculation */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold">Example: $100 Contribution Breakdown</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-background rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">Tech Partner</p>
                <p className="text-lg font-bold">${techAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{techFeeNum}% of $100</p>
              </div>
              <div className="bg-background rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">KTB Marketing</p>
                <p className="text-lg font-bold">${ktbAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{ktbFeeNum}% of ${remaining.toFixed(0)}</p>
              </div>
              <div className="bg-background rounded p-3 text-center">
                <p className="text-xs text-muted-foreground">Plantation Partner</p>
                <p className="text-lg font-bold">${plantationAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{plantationFee}% of ${remaining.toFixed(0)}</p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || plantationFee < 0}
            className="mt-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Wallet Settings
          </Button>

          {plantationFee < 0 && (
            <p className="text-sm text-destructive">KTB fee cannot exceed 100%. Please adjust.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
