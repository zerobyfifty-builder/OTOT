import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Plus, DollarSign, TreePine, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function InstitutionalDisbursements() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    stakeholder_org_id: '',
    amount: 0,
    tree_count: 0,
    reference: '',
    ktb_transfer_reference: '',
    notes: '',
    disbursement_date: '',
  });

  // Fetch stakeholder organizations
  const { data: stakeholders } = useQuery({
    queryKey: ["stakeholderOrgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("category", "stakeholder")
        .eq("is_active", true)
        .eq("archived", false);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all disbursements
  const { data: disbursements, isLoading, refetch } = useQuery({
    queryKey: ["allDisbursements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stakeholder_disbursements")
        .select("*, organizations:stakeholder_org_id(name)")
        .order("disbursement_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch tree allocations per stakeholder
  const { data: allocations } = useQuery({
    queryKey: ["treeAllocations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("stakeholder_org_id, num_trees, amount_paid, planting_status")
        .not("stakeholder_org_id", "is", null);
      if (error) throw error;
      
      const grouped: Record<string, { trees: number; amount: number; planted: number }> = {};
      data?.forEach(t => {
        const key = t.stakeholder_org_id!;
        if (!grouped[key]) grouped[key] = { trees: 0, amount: 0, planted: 0 };
        grouped[key].trees += t.num_trees;
        grouped[key].amount += Number(t.amount_paid);
        if (t.planting_status === 'planted' || t.planting_status === 'verified') {
          grouped[key].planted += t.num_trees;
        }
      });
      return grouped;
    },
  });

  const createDisbursement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stakeholder_disbursements").insert({
        stakeholder_org_id: form.stakeholder_org_id,
        amount: form.amount,
        tree_count: form.tree_count,
        reference: form.reference,
        ktb_transfer_reference: form.ktb_transfer_reference,
        notes: form.notes,
        disbursement_date: form.disbursement_date,
        status: 'pending',
        currency: 'KES',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allDisbursements"] });
      toast.success("Disbursement created");
      setOpen(false);
      setForm({ stakeholder_org_id: '', amount: 0, tree_count: 0, reference: '', ktb_transfer_reference: '', notes: '', disbursement_date: '' });
    },
    onError: () => toast.error("Failed to create disbursement"),
  });

  const totalDisbursed = disbursements?.reduce((s, d) => s + Number(d.amount), 0) || 0;
  const pendingCount = disbursements?.filter(d => d.status === 'pending').length || 0;

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'reconciled': return 'default';
      case 'received': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Disbursements</h1>
          <p className="text-muted-foreground mt-1">Manage fund transfers to plantation partners</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Disbursement</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create Disbursement</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Plantation Partner</Label>
                  <Select value={form.stakeholder_org_id} onValueChange={v => setForm({ ...form, stakeholder_org_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                    <SelectContent>
                      {stakeholders?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount (KES)</Label>
                    <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} />
                  </div>
                  <div>
                    <Label>Tree Count</Label>
                    <Input type="number" value={form.tree_count} onChange={e => setForm({ ...form, tree_count: +e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Disbursement Date</Label>
                  <Input type="date" value={form.disbursement_date} onChange={e => setForm({ ...form, disbursement_date: e.target.value })} />
                </div>
                <div>
                  <Label>KTB Transfer Reference</Label>
                  <Input value={form.ktb_transfer_reference} onChange={e => setForm({ ...form, ktb_transfer_reference: e.target.value })} />
                </div>
                <div>
                  <Label>Reference</Label>
                  <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button className="w-full" onClick={() => createDisbursement.mutate()} disabled={!form.stakeholder_org_id || !form.amount || !form.disbursement_date || createDisbursement.isPending}>
                  {createDisbursement.isPending ? 'Creating...' : 'Create Disbursement'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Total Disbursed</p><p className="text-2xl font-bold">KES {formatNumber(totalDisbursed)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100"><TreePine className="h-5 w-5 text-orange-600" /></div>
            <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold">{pendingCount}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">Partners</p><p className="text-2xl font-bold">{stakeholders?.length || 0}</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Allocation Summary */}
      {stakeholders && allocations && Object.keys(allocations).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Partner Allocations Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Trees Allocated</TableHead>
                    <TableHead>Trees Planted</TableHead>
                    <TableHead>Tourist Payments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stakeholders.filter(s => allocations[s.id]).map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{formatNumber(allocations[s.id].trees)}</TableCell>
                      <TableCell>{formatNumber(allocations[s.id].planted)}</TableCell>
                      <TableCell>${formatNumber(allocations[s.id].amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Disbursement Records</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !disbursements?.length ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No disbursements recorded yet.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Trees</TableHead>
                    <TableHead>KTB Ref</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disbursements.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.disbursement_date}</TableCell>
                      <TableCell className="font-medium">{d.organizations?.name || '-'}</TableCell>
                      <TableCell>KES {Number(d.amount).toLocaleString()}</TableCell>
                      <TableCell>{d.tree_count || '-'}</TableCell>
                      <TableCell>{d.ktb_transfer_reference || '-'}</TableCell>
                      <TableCell><Badge variant={getStatusVariant(d.status)}>{d.status}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{d.notes || '-'}</TableCell>
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
}
