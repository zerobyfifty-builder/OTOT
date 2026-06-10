import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Layers, Info, Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useContributionTiers,
  useTierVisibility,
  type ContributionTier,
  type TierType,
  type TierPortal,
} from '@/hooks/useContributionTiers';
import { computeTierPrice } from '@/hooks/useTierPrice';

const formatUSD = (v: number) => `$${v.toFixed(2)}`;

interface TierFormState {
  id?: string;
  key: string;
  name: string;
  description: string;
  tier_type: TierType;
  trees_count: number | null;
  min_trees: number | null;
  max_trees: number | null;
  duration_months: number | null;
  recurring_interval: string;
  badge: string;
  sort_order: number;
  price_override_usd: number | null;
  is_active: boolean;
}

const emptyForm: TierFormState = {
  key: '',
  name: '',
  description: '',
  tier_type: 'fixed',
  trees_count: 1,
  min_trees: null,
  max_trees: null,
  duration_months: null,
  recurring_interval: '',
  badge: '',
  sort_order: 100,
  price_override_usd: null,
  is_active: true,
};

const ContributionTierSettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<TierFormState>(emptyForm);

  const { data: config } = useQuery({
    queryKey: ['active-planting-config-tiers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('planting_cost_configs')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
  });

  const tiersQ = useContributionTiers();
  const visQ = useTierVisibility();
  const perTree = Number(config?.donation_usd || 0);

  const isVisible = (tierId: string, portal: TierPortal) =>
    (visQ.data || []).some((v) => v.tier_id === tierId && v.portal === portal && v.is_visible);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['contribution-tiers'] });
    queryClient.invalidateQueries({ queryKey: ['contribution-tier-visibility'] });
  };

  const upsertVisibility = useMutation({
    mutationFn: async ({ tierId, portal, value }: { tierId: string; portal: TierPortal; value: boolean }) => {
      const { error } = await supabase
        .from('contribution_tier_visibility')
        .upsert({ tier_id: tierId, portal, is_visible: value }, { onConflict: 'tier_id,portal' });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from('contribution_tiers').update({ is_active: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const saveTier = useMutation({
    mutationFn: async (state: TierFormState) => {
      const payload = {
        key: state.key.trim(),
        name: state.name.trim(),
        description: state.description.trim() || null,
        tier_type: state.tier_type,
        trees_count: state.tier_type === 'custom_range' ? null : state.trees_count,
        min_trees: state.tier_type === 'custom_range' ? state.min_trees : null,
        max_trees: state.tier_type === 'custom_range' ? state.max_trees : null,
        duration_months: state.tier_type === 'subscription' || state.tier_type === 'recurring' ? state.duration_months : null,
        recurring_interval: state.tier_type === 'recurring' ? state.recurring_interval || null : null,
        badge: state.badge || null,
        sort_order: state.sort_order,
        price_override_usd: state.price_override_usd,
        is_active: state.is_active,
      };
      if (state.id) {
        const { error } = await supabase.from('contribution_tiers').update(payload).eq('id', state.id);
        if (error) throw error;
        return state.id;
      } else {
        const { data, error } = await supabase
          .from('contribution_tiers')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        // create both portal visibility rows
        await supabase.from('contribution_tier_visibility').upsert([
          { tier_id: data.id, portal: 'tourist' as TierPortal, is_visible: false },
          { tier_id: data.id, portal: 'b2b' as TierPortal, is_visible: false },
        ], { onConflict: 'tier_id,portal' });
        return data.id;
      }
    },
    onSuccess: () => {
      invalidate();
      setSheetOpen(false);
      toast({ title: 'Saved' });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contribution_tiers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Deleted' });
    },
    onError: (e: any) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const openCreate = () => {
    setForm({ ...emptyForm });
    setSheetOpen(true);
  };

  const openEdit = (t: ContributionTier) => {
    setForm({
      id: t.id,
      key: t.key,
      name: t.name,
      description: t.description || '',
      tier_type: t.tier_type,
      trees_count: t.trees_count,
      min_trees: t.min_trees,
      max_trees: t.max_trees,
      duration_months: t.duration_months,
      recurring_interval: t.recurring_interval || '',
      badge: t.badge || '',
      sort_order: t.sort_order,
      price_override_usd: t.price_override_usd,
      is_active: t.is_active,
    });
    setSheetOpen(true);
  };

  const previewTier: ContributionTier = useMemo(
    () => ({
      id: form.id || 'preview',
      key: form.key,
      name: form.name,
      description: form.description,
      tier_type: form.tier_type,
      trees_count: form.trees_count,
      min_trees: form.min_trees,
      max_trees: form.max_trees,
      duration_months: form.duration_months,
      recurring_interval: form.recurring_interval,
      badge: form.badge,
      sort_order: form.sort_order,
      price_override_usd: form.price_override_usd,
      is_active: form.is_active,
    }),
    [form],
  );
  const previewPrice = computeTierPrice(previewTier, perTree);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Contribution Tier Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage tiers and control visibility per portal (Tourist, B2B).
          </p>
        </div>
        <Button onClick={openCreate} disabled={!config}>
          <Plus className="h-4 w-4 mr-1" /> Add Tier
        </Button>
      </div>

      {!config ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No active pricing configuration. Approve a planting cost submission first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Catalog</CardTitle>
                  <CardDescription>
                    Per-tree cost from active config: <span className="font-medium">{formatUSD(perTree)}</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Sort</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Trees</TableHead>
                    <TableHead className="text-right">Auto $</TableHead>
                    <TableHead className="text-right">Override $</TableHead>
                    <TableHead className="text-right">Savings</TableHead>
                    <TableHead className="text-center">Tourist</TableHead>
                    <TableHead className="text-center">B2B</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tiersQ.data || []).map((t) => {
                    const p = computeTierPrice(t, perTree);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="tabular-nums">{t.sort_order}</TableCell>
                        <TableCell>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.key}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{t.tier_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t.tier_type === 'custom_range'
                            ? `${t.min_trees ?? '-'}–${t.max_trees ?? '-'}`
                            : t.trees_count ?? '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t.tier_type === 'custom_range'
                            ? `${formatUSD(p.rangeAutoLow || 0)}–${formatUSD(p.rangeAutoHigh || 0)}`
                            : formatUSD(p.autoPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t.price_override_usd != null ? formatUSD(Number(t.price_override_usd)) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.savings > 0 ? (
                            <span className="text-emerald-600">{formatUSD(p.savings)}</span>
                          ) : p.isPremium ? (
                            <span className="text-muted-foreground">premium</span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={isVisible(t.id, 'tourist')}
                            onCheckedChange={(v) =>
                              upsertVisibility.mutate({ tierId: t.id, portal: 'tourist', value: v })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={isVisible(t.id, 'b2b')}
                            onCheckedChange={(v) =>
                              upsertVisibility.mutate({ tierId: t.id, portal: 'b2b', value: v })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={t.is_active}
                            onCheckedChange={(v) => toggleActive.mutate({ id: t.id, value: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(t)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete tier "${t.name}"?`)) deleteTier.mutate(t.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!tiersQ.isLoading && (tiersQ.data || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        No tiers yet. Click "Add Tier" to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground flex items-start gap-1.5 px-1">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            Auto prices are derived from the active per-tree cost. Override is optional — set a lower amount to show
            "Save $X" on tier cards, or higher for a premium tier. The Tourist tree-purchase page always shows the
            existing Flexible and Monthly options; enabled tiers appear below them.
          </p>
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle>{form.id ? 'Edit Tier' : 'Add Tier'}</SheetTitle>
            <SheetDescription>
              Configure tier details. Auto price is calculated from {formatUSD(perTree)} per tree.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Key</Label>
                <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="grove_100" />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Grove (100 trees)" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.tier_type}
                  onValueChange={(v) => setForm({ ...form, tier_type: v as TierType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="custom_range">Custom range</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Badge</Label>
                <Select value={form.badge || 'none'} onValueChange={(v) => setForm({ ...form, badge: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.tier_type === 'custom_range' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min trees</Label>
                  <Input
                    type="number"
                    value={form.min_trees ?? ''}
                    onChange={(e) => setForm({ ...form, min_trees: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label>Max trees</Label>
                  <Input
                    type="number"
                    value={form.max_trees ?? ''}
                    onChange={(e) => setForm({ ...form, max_trees: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label>Trees count</Label>
                <Input
                  type="number"
                  value={form.trees_count ?? ''}
                  onChange={(e) => setForm({ ...form, trees_count: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            )}

            {(form.tier_type === 'subscription' || form.tier_type === 'recurring') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duration (months)</Label>
                  <Input
                    type="number"
                    value={form.duration_months ?? ''}
                    onChange={(e) => setForm({ ...form, duration_months: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                {form.tier_type === 'recurring' && (
                  <div>
                    <Label>Interval</Label>
                    <Select
                      value={form.recurring_interval || 'monthly'}
                      onValueChange={(v) => setForm({ ...form, recurring_interval: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Price override (USD)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Leave empty to use auto price"
                value={form.price_override_usd ?? ''}
                onChange={(e) =>
                  setForm({ ...form, price_override_usd: e.target.value === '' ? null : Number(e.target.value) })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive tiers are hidden from all portals.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div className="font-medium">Live preview</div>
              <div className="flex justify-between tabular-nums">
                <span className="text-muted-foreground">Auto price</span>
                <span>
                  {form.tier_type === 'custom_range'
                    ? `${formatUSD(previewPrice.rangeAutoLow || 0)} – ${formatUSD(previewPrice.rangeAutoHigh || 0)}`
                    : formatUSD(previewPrice.autoPrice)}
                </span>
              </div>
              <div className="flex justify-between tabular-nums">
                <span className="text-muted-foreground">Final price</span>
                <span className="font-semibold">{formatUSD(previewPrice.finalPrice)}</span>
              </div>
              {previewPrice.savings > 0 && (
                <div className="flex justify-between tabular-nums text-emerald-600">
                  <span>Savings</span>
                  <span>{formatUSD(previewPrice.savings)}</span>
                </div>
              )}
              {previewPrice.monthly != null && (
                <div className="flex justify-between tabular-nums">
                  <span className="text-muted-foreground">Monthly</span>
                  <span>{formatUSD(previewPrice.monthly)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => saveTier.mutate(form)}
                disabled={!form.name || !form.key || saveTier.isPending}
              >
                {saveTier.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ContributionTierSettings;
