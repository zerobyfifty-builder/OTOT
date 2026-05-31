import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Info, Send } from 'lucide-react';

const COST_FIELDS = [
  { key: 'cost_seedling_kes', label: 'Seedling / sapling cost', helper: 'KFS subsidised avg KES 20–50; private nursery KES 50–100' },
  { key: 'cost_planting_kes', label: 'Planting labour + site preparation', helper: 'Pit digging, planting, initial watering; CFA labour rate' },
  { key: 'cost_aftercare_yr1_kes', label: 'Year 1 aftercare', helper: 'Weeding ×4, watering, pest scouting, livestock patrol' },
  { key: 'cost_aftercare_yr2_kes', label: 'Year 2 aftercare', helper: 'Reduced weeding, pruning, quarterly health check' },
  { key: 'cost_aftercare_yr3_kes', label: 'Year 3 aftercare', helper: 'Light weeding, annual inspection; tree nearing self-sufficiency' },
  { key: 'cost_gps_mrv_kes', label: 'GPS geotagging + photo MRV', helper: 'OTOT ID tag, planting-day photo upload, GPS coordinates' },
  { key: 'cost_admin_overhead_kes', label: 'MoE admin and overhead', helper: 'Programme coordination, CFA benefit-sharing, inspection' },
] as const;

type CostKey = typeof COST_FIELDS[number]['key'];

const emptyForm = (): Record<CostKey, string> => ({
  cost_seedling_kes: '', cost_planting_kes: '', cost_aftercare_yr1_kes: '',
  cost_aftercare_yr2_kes: '', cost_aftercare_yr3_kes: '', cost_gps_mrv_kes: '', cost_admin_overhead_kes: '',
});

const formatKES = (v: number) => Math.round(v).toLocaleString('en-US');
const formatUSD = (v: number) => `$${v.toFixed(2)}`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fxRate?: number;
  onCreated?: (submissionId: string) => void;
}

export const AddPlantingCostsSheet: React.FC<Props> = ({ open, onOpenChange, fxRate = 130, onCreated }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<CostKey, string>>(emptyForm());

  useEffect(() => {
    if (open) setValues(emptyForm());
  }, [open]);

  const totalKES = useMemo(
    () => COST_FIELDS.reduce((sum, f) => sum + (parseFloat(values[f.key]) || 0), 0),
    [values]
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      const row: Record<string, any> = {
        submitted_by: user!.id,
        owner_org: 'KTB Admin',
        status: 'pending_review',
        total_cost_kes: totalKES,
      };
      COST_FIELDS.forEach(f => { row[f.key] = parseFloat(values[f.key]) || 0; });
      const { data, error } = await supabase
        .from('planting_cost_submissions')
        .insert(row as any)
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Planting costs created. Continue with configuration.');
      queryClient.invalidateQueries({ queryKey: ['all-planting-submissions'] });
      onOpenChange(false);
      if (data?.id) onCreated?.(data.id);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create'),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Planting Costs</SheetTitle>
          <SheetDescription>Enter all values in KES per tree. Then continue with species, fees, and publish.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {COST_FIELDS.map(f => {
            const val = parseFloat(values[f.key]) || 0;
            return (
              <div key={f.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{f.label} (KES)</Label>
                  {val > 0 && <span className="text-xs text-muted-foreground">{formatUSD(val / fxRate)}</span>}
                </div>
                <Input
                  type="number"
                  placeholder="0"
                  value={values[f.key]}
                  onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  {f.helper}
                </p>
              </div>
            );
          })}

          <Separator />
          <div className="flex items-center justify-between text-base font-semibold p-3 rounded-lg bg-muted/50">
            <span>Total per tree</span>
            <span>KES {formatKES(totalKES)} = {formatUSD(totalKES / fxRate)}</span>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || totalKES <= 0}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {submitMutation.isPending ? 'Creating...' : 'Create & Continue'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddPlantingCostsSheet;
