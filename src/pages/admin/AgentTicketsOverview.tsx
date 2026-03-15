import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentTicketsOverview() {
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-agent-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_tickets')
        .select('*, travel_agents(name, business_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateKtbStatus = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('agent_tickets')
        .update({ ktb_payment_status: 'Paid', ktb_payment_date: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-tickets'] });
      toast({ title: 'Updated', description: 'KTB payment status updated to Paid' });
    },
  });

  const updateTreeStatus = useMutation({
    mutationFn: async (ticketId: string) => {
      const ticket = tickets?.find(t => t.id === ticketId);
      if (!ticket) return;
      const { error } = await supabase
        .from('agent_tickets')
        .update({ tree_status: 'Planted', trees_planted: ticket.trees_needed })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-tickets'] });
      toast({ title: 'Updated', description: 'Tree status updated to Planted' });
    },
  });

  const totalTickets = tickets?.length || 0;
  const totalCO2 = tickets?.reduce((s, t) => s + Number(t.total_co2), 0) || 0;
  const paymentDue = tickets?.filter(t => t.ktb_payment_status === 'Payment Due').length || 0;
  const notPlanted = tickets?.filter(t => t.tree_status === 'Not Planted').length || 0;

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Tickets Overview</h1>
        <p className="text-muted-foreground">All carbon offset tickets from travel agents</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Tickets</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalTickets}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total CO₂ Offset</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{(totalCO2 / 1000).toFixed(1)} t</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">KTB Payments Due</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-orange-600">{paymentDue}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Trees Not Planted</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-red-600">{notPlanted}</p></CardContent></Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Staff Name</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>LPO #</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Travel Date</TableHead>
              <TableHead>CO₂</TableHead>
              <TableHead>Trees</TableHead>
              <TableHead>Tree Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>KTB Payment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!tickets || tickets.length === 0) ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No tickets yet.</TableCell></TableRow>
            ) : (
              tickets.map((ticket) => {
                const agentInfo = Array.isArray(ticket.travel_agents) ? ticket.travel_agents[0] : ticket.travel_agents;
                return (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{agentInfo?.name || '-'}</TableCell>
                    <TableCell>{ticket.staff_name}</TableCell>
                    <TableCell>{ticket.department}</TableCell>
                    <TableCell>{ticket.lpo_number}</TableCell>
                    <TableCell>{ticket.origin_airport} → {ticket.destination_airport}</TableCell>
                    <TableCell>{format(new Date(ticket.from_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{Math.round(Number(ticket.total_co2)).toLocaleString()} kg</TableCell>
                    <TableCell>{ticket.trees_needed}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.tree_status === 'Planted' ? 'default' : 'secondary'}>{ticket.tree_status}</Badge>
                    </TableCell>
                    <TableCell>KES {Number(ticket.offset_amount_paid).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.ktb_payment_status === 'Paid' ? 'default' : 'destructive'}>{ticket.ktb_payment_status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ticket.ktb_payment_status === 'Payment Due' && (
                            <DropdownMenuItem onClick={() => updateKtbStatus.mutate(ticket.id)}>
                              <Check className="mr-2 h-4 w-4" /> Mark KTB as Paid
                            </DropdownMenuItem>
                          )}
                          {ticket.tree_status === 'Not Planted' && (
                            <DropdownMenuItem onClick={() => updateTreeStatus.mutate(ticket.id)}>
                              <Check className="mr-2 h-4 w-4" /> Mark Trees as Planted
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
