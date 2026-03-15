import { useNavigate } from "react-router-dom";
import { useAgentAuth } from "@/contexts/AgentAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, FileText, DollarSign, TreePine, Plane, AlertCircle } from "lucide-react";
import ktbLogo from "@/assets/ktb-logo.png";

export const AgentDashboard = () => {
  const navigate = useNavigate();
  const { agent } = useAgentAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['agent-stats', agent?.id],
    queryFn: async () => {
      const { data: tickets } = await supabase
        .from('agent_tickets')
        .select('*')
        .eq('agent_id', agent!.id);

      const totalTickets = tickets?.length || 0;
      const notPlanted = tickets?.filter(t => t.tree_status === 'Not Planted').length || 0;
      const planted = tickets?.filter(t => t.tree_status === 'Planted').length || 0;
      const paymentDue = tickets?.filter(t => t.ktb_payment_status === 'Payment Due').length || 0;
      const totalCO2 = tickets?.reduce((sum, t) => sum + Number(t.total_co2), 0) || 0;
      const totalTreesNeeded = tickets?.reduce((sum, t) => sum + t.trees_needed, 0) || 0;
      const totalAmountPaid = tickets?.reduce((sum, t) => sum + Number(t.offset_amount_paid), 0) || 0;
      const pendingReimbursement = tickets?.filter(t => t.ktb_payment_status === 'Payment Due')
        .reduce((sum, t) => sum + Number(t.offset_amount_paid), 0) || 0;

      return { totalTickets, notPlanted, planted, paymentDue, totalCO2, totalTreesNeeded, totalAmountPaid, pendingReimbursement };
    },
    enabled: !!agent,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Welcome, {agent?.name}! ✈️</h2>
          <p className="text-muted-foreground mt-1">{agent?.business_name} — Government Travel Carbon Offset Portal</p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">{stats?.totalTickets || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">{stats?.notPlanted || 0} pending offset</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total CO₂ Offset</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{((stats?.totalCO2 || 0) / 1000).toFixed(1)}</div>
              <p className="text-sm text-muted-foreground mt-1">tonnes CO₂ • {stats?.totalTreesNeeded || 0} trees</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Trees Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Planted:</span>
                  <span className="font-semibold text-green-600">{stats?.planted || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Not Planted:</span>
                  <span className="font-semibold text-orange-600">{stats?.notPlanted || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">KTB Reimbursement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">KES {stats?.pendingReimbursement?.toLocaleString() || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">{stats?.paymentDue || 0} payments due</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/agent/calculate")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Calculate & Offset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Enter ticket details, calculate carbon emissions, and offset by planting trees</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/agent/tickets")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                My Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View all booked tickets, track offsets, and download invoices</p>
              <p className="text-2xl font-bold mt-2">{stats?.totalTickets || 0} tickets</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/agent/reimbursements")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Reimbursements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Track KTB payment status for offset costs</p>
              <p className="text-2xl font-bold mt-2">{stats?.paymentDue || 0} pending</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
