import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TreePine, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const OwnerPlanting = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ block_name: '', beat: '', seedlings_planted: '', planter_name: '', date_planted: '', notes: '' });

  const { data: orgId } = useQuery({
    queryKey: ["ownerOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ["plantingRecords", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("planting_records").select("*").eq("owner_org_id", orgId!).order("date_planted", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("planting_records").insert({
        owner_org_id: orgId!,
        block_name: form.block_name,
        beat: form.beat,
        seedlings_planted: parseInt(form.seedlings_planted) || 0,
        planter_name: form.planter_name,
        date_planted: form.date_planted,
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Planting record added");
      setShowAdd(false);
      setForm({ block_name: '', beat: '', seedlings_planted: '', planter_name: '', date_planted: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ["plantingRecords"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Planting Records</h1>
          <p className="text-muted-foreground mt-1">Track seedling planting by block, beat, and planter</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Record Planting</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record New Planting</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Block Name</Label><Input value={form.block_name} onChange={e => setForm({...form, block_name: e.target.value})} placeholder="e.g. South West Mau" /></div>
                <div><Label>Beat</Label><Input value={form.beat} onChange={e => setForm({...form, beat: e.target.value})} placeholder="Beat identifier" /></div>
                <div><Label>Seedlings Planted</Label><Input type="number" value={form.seedlings_planted} onChange={e => setForm({...form, seedlings_planted: e.target.value})} /></div>
                <div><Label>Planter Name</Label><Input value={form.planter_name} onChange={e => setForm({...form, planter_name: e.target.value})} /></div>
                <div><Label>Date Planted</Label><Input type="date" value={form.date_planted} onChange={e => setForm({...form, date_planted: e.target.value})} /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                <Button onClick={() => addMutation.mutate()} disabled={!form.block_name || !form.date_planted || addMutation.isPending} className="w-full">
                  {addMutation.isPending ? 'Saving...' : 'Save Record'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !records?.length ? (
            <div className="text-center py-12">
              <TreePine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No planting records yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Beat</TableHead>
                  <TableHead>Seedlings</TableHead>
                  <TableHead>Planter</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date_planted}</TableCell>
                    <TableCell className="font-medium">{r.block_name}</TableCell>
                    <TableCell>{r.beat || '-'}</TableCell>
                    <TableCell>{r.seedlings_planted.toLocaleString()}</TableCell>
                    <TableCell>{r.planter_name || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
