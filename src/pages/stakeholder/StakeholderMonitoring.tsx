import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, BarChart3, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const StakeholderMonitoring = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPlanting, setSelectedPlanting] = useState('');
  const [form, setForm] = useState({ measurement_date: '', height_cm: '', survival_count: '', original_count: '', notes: '' });

  const { data: orgId } = useQuery({
    queryKey: ["stakeholderOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: plantings } = useQuery({
    queryKey: ["plantingsForMonitoring", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("planting_records").select("id, block_name, beat, date_planted").eq("stakeholder_org_id", orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ["monitoringRecords", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitoring_records")
        .select("*, planting_records!inner(block_name, beat, stakeholder_org_id)")
        .order("measurement_date", { ascending: false });
      if (error) throw error;
      return data?.filter(r => (r.planting_records as any)?.stakeholder_org_id === orgId) || [];
    },
    enabled: !!orgId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("monitoring_records").insert({
        planting_record_id: selectedPlanting,
        measurement_date: form.measurement_date,
        height_cm: parseFloat(form.height_cm) || null,
        survival_count: parseInt(form.survival_count) || null,
        original_count: parseInt(form.original_count) || null,
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Monitoring record added");
      setShowAdd(false);
      setForm({ measurement_date: '', height_cm: '', survival_count: '', original_count: '', notes: '' });
      setSelectedPlanting('');
      queryClient.invalidateQueries({ queryKey: ["monitoringRecords"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const chartData = records?.map(r => ({
    date: r.measurement_date,
    height: Number(r.height_cm) || 0,
    survival: Number(r.survival_rate) || 0,
  })).reverse() || [];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Monitoring</h1>
          <p className="text-muted-foreground mt-1">Track growth height and survival rates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Add Record</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Monitoring Record</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Planting Record</Label>
                  <Select value={selectedPlanting} onValueChange={setSelectedPlanting}>
                    <SelectTrigger><SelectValue placeholder="Select planting" /></SelectTrigger>
                    <SelectContent>
                      {plantings?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.block_name} — {p.beat || 'N/A'} ({p.date_planted})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Measurement Date</Label><Input type="date" value={form.measurement_date} onChange={e => setForm({...form, measurement_date: e.target.value})} /></div>
                <div><Label>Height (cm)</Label><Input type="number" value={form.height_cm} onChange={e => setForm({...form, height_cm: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Survival Count</Label><Input type="number" value={form.survival_count} onChange={e => setForm({...form, survival_count: e.target.value})} /></div>
                  <div><Label>Original Count</Label><Input type="number" value={form.original_count} onChange={e => setForm({...form, original_count: e.target.value})} /></div>
                </div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                <Button onClick={() => addMutation.mutate()} disabled={!selectedPlanting || !form.measurement_date || addMutation.isPending} className="w-full">
                  {addMutation.isPending ? 'Saving...' : 'Save Record'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Growth Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Growth & Survival Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="height" stroke="hsl(142 70% 45%)" strokeWidth={2} name="Height (cm)" />
                <Line type="monotone" dataKey="survival" stroke="hsl(200 70% 50%)" strokeWidth={2} name="Survival %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !records?.length ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No monitoring records yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Height (cm)</TableHead>
                  <TableHead>Survival</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.measurement_date}</TableCell>
                    <TableCell>{(r.planting_records as any)?.block_name}</TableCell>
                    <TableCell>{r.height_cm || '-'}</TableCell>
                    <TableCell>{r.survival_count}/{r.original_count}</TableCell>
                    <TableCell className={Number(r.survival_rate) < 70 ? 'text-destructive font-medium' : 'text-accent font-medium'}>
                      {Number(r.survival_rate).toFixed(1)}%
                    </TableCell>
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
