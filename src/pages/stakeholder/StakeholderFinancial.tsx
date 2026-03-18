import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatNumber } from "@/lib/utils";

export const StakeholderFinancial = () => {
  const { user } = useAuth();

  const { data: orgId } = useQuery({
    queryKey: ["stakeholderOrgId", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("organization_id").eq("user_id", user!.id).single();
      return data?.organization_id;
    },
    enabled: !!user?.id,
  });

  const { data: disbursements, isLoading, refetch } = useQuery({
    queryKey: ["disbursements", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("stakeholder_disbursements").select("*").eq("stakeholder_org_id", orgId!).order("disbursement_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch allocated tree value to calculate expected funds
  const { data: allocatedTreeValue } = useQuery({
    queryKey: ["allocatedTreeValue", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trees")
        .select("num_trees, amount_paid")
        .eq("stakeholder_org_id", orgId!);
      if (error) throw error;
      const totalTrees = data?.reduce((s, t) => s + t.num_trees, 0) || 0;
      const totalValue = data?.reduce((s, t) => s + Number(t.amount_paid), 0) || 0;
      return { totalTrees, totalValue };
    },
    enabled: !!orgId,
  });

  const totals = {
    received: disbursements?.filter(d => d.status === 'received' || d.status === 'reconciled').reduce((s, d) => s + Number(d.amount), 0) || 0,
    pending: disbursements?.filter(d => d.status === 'pending').reduce((s, d) => s + Number(d.amount), 0) || 0,
    reconciled: disbursements?.filter(d => d.status === 'reconciled').reduce((s, d) => s + Number(d.amount), 0) || 0,
  };

  const getStatusVariant = (status: string) => {
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
          <h1 className="text-2xl sm:text-3xl font-bold">Financial</h1>
          <p className="text-muted-foreground mt-1">KTB fund disbursements and reconciliation</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Received</p>
            <p className="text-2xl font-bold text-accent">KES {formatNumber(totals.received)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-orange-600">KES {formatNumber(totals.pending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reconciled</p>
            <p className="text-2xl font-bold text-primary">KES {formatNumber(totals.reconciled)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !disbursements?.length ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No disbursements recorded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disbursements.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{d.disbursement_date}</TableCell>
                    <TableCell className="font-medium">{Number(d.amount).toLocaleString()}</TableCell>
                    <TableCell>{d.currency}</TableCell>
                    <TableCell>{d.reference || '-'}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(d.status)}>{d.status}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{d.notes || '-'}</TableCell>
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
