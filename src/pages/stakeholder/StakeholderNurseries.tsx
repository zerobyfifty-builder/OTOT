import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Sprout, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const StakeholderNurseries = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ cbo_name: '', block_name: '', location: '', capacity: '' });

  const { data: orgId } = useQuery({
    queryKey: ["stakeholderOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: nurseries, isLoading, refetch } = useQuery({
    queryKey: ["nurseries", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("nurseries").select("*").eq("stakeholder_org_id", orgId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("nurseries").insert({
        stakeholder_org_id: orgId!,
        cbo_name: form.cbo_name,
        block_name: form.block_name,
        location: form.location,
        capacity: parseInt(form.capacity) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nursery added");
      setShowAdd(false);
      setForm({ cbo_name: '', block_name: '', location: '', capacity: '' });
      queryClient.invalidateQueries({ queryKey: ["nurseries"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Nurseries</h1>
          <p className="text-muted-foreground mt-1">Community-Based Organization nurseries by block</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Nursery</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Nursery</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div><Label>CBO Name</Label><Input value={form.cbo_name} onChange={e => setForm({...form, cbo_name: e.target.value})} placeholder="Community group name" /></div>
                <div><Label>Block Name</Label><Input value={form.block_name} onChange={e => setForm({...form, block_name: e.target.value})} placeholder="e.g. South West Mau" /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Location details" /></div>
                <div><Label>Capacity (seedlings)</Label><Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} placeholder="0" /></div>
                <Button onClick={() => addMutation.mutate()} disabled={!form.cbo_name || !form.block_name || addMutation.isPending} className="w-full">
                  {addMutation.isPending ? 'Adding...' : 'Add Nursery'}
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
          ) : !nurseries?.length ? (
            <div className="text-center py-12">
              <Sprout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No nurseries registered yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CBO Name</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nurseries.map(n => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.cbo_name}</TableCell>
                    <TableCell>{n.block_name}</TableCell>
                    <TableCell>{n.location || '-'}</TableCell>
                    <TableCell>{n.capacity?.toLocaleString()}</TableCell>
                    <TableCell><Badge variant={n.is_active ? "default" : "secondary"}>{n.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
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
