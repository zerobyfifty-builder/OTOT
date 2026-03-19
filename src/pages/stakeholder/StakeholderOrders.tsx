import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TreePine, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";

const PLANTING_STATUSES = [
  'pending_allocation',
  'allocated',
  'funds_pending',
  'funds_received',
  'planting_in_progress',
  'planted',
  'monitored',
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending_allocation: 'Pending Allocation',
  allocated: 'Allocated',
  funds_pending: 'Funds Pending',
  funds_received: 'Funds Received',
  planting_in_progress: 'Planting In Progress',
  planted: 'Planted',
  monitored: 'Monitored',
};

const STATUS_COLORS: Record<string, string> = {
  pending_allocation: 'secondary',
  allocated: 'outline',
  funds_pending: 'outline',
  funds_received: 'secondary',
  planting_in_progress: 'default',
  planted: 'default',
  monitored: 'default',
};

export const StakeholderOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orgId } = useQuery({
    queryKey: ["stakeholderOrgId", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      console.log("[STAKEHOLDER_ORDERS] orgId query result:", data?.organization_id, "error:", error);
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: trees, isLoading, refetch } = useQuery({
    queryKey: ["stakeholderOrders", orgId],
    queryFn: async () => {
      console.log("[STAKEHOLDER_ORDERS] Fetching trees for orgId:", orgId);
      const { data, error } = await supabase
        .from("trees")
        .select("id, otot_id, num_trees, amount_paid, created_at, planting_status, status, plant_date")
        .eq("stakeholder_org_id", orgId!)
        .order("created_at", { ascending: false });
      console.log("[STAKEHOLDER_ORDERS] Trees query result:", data?.length, "rows, error:", error);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: disbursements } = useQuery({
    queryKey: ["stakeholderDisbursementTotal", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stakeholder_disbursements")
        .select("amount, status")
        .eq("stakeholder_org_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ treeId, status }: { treeId: string; status: string }) => {
      const { error } = await supabase
        .from("trees")
        .update({ planting_status: status as any })
        .eq("id", treeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholderOrders"] });
      toast.success("Planting status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const totalTrees = trees?.reduce((s, t) => s + t.num_trees, 0) || 0;
  const totalRevenue = trees?.reduce((s, t) => s + Number(t.amount_paid), 0) || 0;
  const fundsReceived = disbursements?.filter(d => d.status === 'received' || d.status === 'reconciled').reduce((s, d) => s + Number(d.amount), 0) || 0;
  const planted = trees?.filter(t => t.planting_status === 'planted' || t.planting_status === 'monitored').reduce((s, t) => s + t.num_trees, 0) || 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Tree Orders</h1>
          <p className="text-muted-foreground mt-1">Trees allocated to your organization from tourist purchases</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><TreePine className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Allocated</p>
                <p className="text-2xl font-bold">{formatNumber(totalTrees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Planted</p>
                <p className="text-2xl font-bold">{formatNumber(planted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100"><DollarSign className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Funds Received</p>
                <p className="text-2xl font-bold">KES {formatNumber(fundsReceived)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100"><Clock className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Planting</p>
                <p className="text-2xl font-bold">{formatNumber(totalTrees - planted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allocated Trees</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !trees?.length ? (
            <div className="text-center py-12">
              <TreePine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No trees have been allocated to your organization yet.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OTOT ID</TableHead>
                    <TableHead>Tourist</TableHead>
                    <TableHead>Trees</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Planting Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trees.map((tree: any) => (
                    <TableRow key={tree.id}>
                      <TableCell className="font-mono text-sm">{tree.otot_id}</TableCell>
                      <TableCell>
                        {tree.users?.first_name 
                          ? `${tree.users.first_name} ${tree.users.last_name?.charAt(0) || ''}.`
                          : tree.users?.email?.split('@')[0] || 'Anonymous'}
                      </TableCell>
                      <TableCell>{tree.num_trees}</TableCell>
                      <TableCell>${Number(tree.amount_paid).toFixed(2)}</TableCell>
                      <TableCell>{new Date(tree.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select
                          value={tree.planting_status || 'pending_allocation'}
                          onValueChange={(value) => updateStatus.mutate({ treeId: tree.id, status: value })}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLANTING_STATUSES.map(s => (
                              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
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
