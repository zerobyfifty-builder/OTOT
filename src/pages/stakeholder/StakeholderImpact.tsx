import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Users, Briefcase, Heart, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const StakeholderImpact = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    reporting_period: '',
    families_supported: 0,
    jobs_created: 0,
    women_employed: 0,
    youth_employed: 0,
    nursery_income_kes: 0,
    notes: '',
  });

  const { data: orgId } = useQuery({
    queryKey: ["stakeholderOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ["communityImpact", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_impact")
        .select("*")
        .eq("stakeholder_org_id", orgId!)
        .order("reporting_period", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("community_impact").insert({
        stakeholder_org_id: orgId!,
        reporting_period: form.reporting_period,
        families_supported: form.families_supported,
        jobs_created: form.jobs_created,
        women_employed: form.women_employed,
        youth_employed: form.youth_employed,
        nursery_income_kes: form.nursery_income_kes,
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityImpact"] });
      toast.success("Impact record added");
      setOpen(false);
      setForm({ reporting_period: '', families_supported: 0, jobs_created: 0, women_employed: 0, youth_employed: 0, nursery_income_kes: 0, notes: '' });
    },
    onError: () => toast.error("Failed to add record"),
  });

  const totals = {
    families: records?.reduce((s, r) => s + (r.families_supported || 0), 0) || 0,
    jobs: records?.reduce((s, r) => s + (r.jobs_created || 0), 0) || 0,
    women: records?.reduce((s, r) => s + (r.women_employed || 0), 0) || 0,
    youth: records?.reduce((s, r) => s + (r.youth_employed || 0), 0) || 0,
    income: records?.reduce((s, r) => s + Number(r.nursery_income_kes || 0), 0) || 0,
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Community Impact</h1>
          <p className="text-muted-foreground mt-1">Report community outcomes from tree planting activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Report</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>New Impact Report</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Reporting Period</Label>
                  <Input type="date" value={form.reporting_period} onChange={e => setForm({ ...form, reporting_period: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Families Supported</Label>
                    <Input type="number" value={form.families_supported} onChange={e => setForm({ ...form, families_supported: +e.target.value })} />
                  </div>
                  <div>
                    <Label>Jobs Created</Label>
                    <Input type="number" value={form.jobs_created} onChange={e => setForm({ ...form, jobs_created: +e.target.value })} />
                  </div>
                  <div>
                    <Label>Women Employed</Label>
                    <Input type="number" value={form.women_employed} onChange={e => setForm({ ...form, women_employed: +e.target.value })} />
                  </div>
                  <div>
                    <Label>Youth Employed</Label>
                    <Input type="number" value={form.youth_employed} onChange={e => setForm({ ...form, youth_employed: +e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Nursery Income (KES)</Label>
                  <Input type="number" value={form.nursery_income_kes} onChange={e => setForm({ ...form, nursery_income_kes: +e.target.value })} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button className="w-full" onClick={() => addRecord.mutate()} disabled={!form.reporting_period || addRecord.isPending}>
                  {addRecord.isPending ? 'Saving...' : 'Save Report'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Families Supported</p><p className="text-2xl font-bold">{formatNumber(totals.families)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><Briefcase className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Jobs Created</p><p className="text-2xl font-bold">{formatNumber(totals.jobs)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-100"><Heart className="h-5 w-5 text-pink-600" /></div>
            <div><p className="text-xs text-muted-foreground">Women Employed</p><p className="text-2xl font-bold">{formatNumber(totals.women)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div><p className="text-xs text-muted-foreground">Youth Employed</p><p className="text-2xl font-bold">{formatNumber(totals.youth)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div><p className="text-xs text-muted-foreground">Nursery Income</p><p className="text-2xl font-bold">KES {formatNumber(totals.income)}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Impact Reports</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !records?.length ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No impact reports recorded yet. Click "Add Report" to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Families</TableHead>
                    <TableHead>Jobs</TableHead>
                    <TableHead>Women</TableHead>
                    <TableHead>Youth</TableHead>
                    <TableHead>Income (KES)</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.reporting_period}</TableCell>
                      <TableCell>{r.families_supported}</TableCell>
                      <TableCell>{r.jobs_created}</TableCell>
                      <TableCell>{r.women_employed}</TableCell>
                      <TableCell>{r.youth_employed}</TableCell>
                      <TableCell>{Number(r.nursery_income_kes).toLocaleString()}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
