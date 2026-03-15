import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/contexts/AgentAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export const AgentReimbursements = () => {
  const { agent } = useAgentAuth();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['agent-reimbursements', agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_tickets')
        .select('*')
        .eq('agent_id', agent!.id)
        .gt('offset_amount_paid', 0)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!agent,
  });

  const paymentDue = tickets?.filter(t => t.ktb_payment_status === 'Payment Due') || [];
  const paid = tickets?.filter(t => t.ktb_payment_status === 'Paid') || [];
  const totalDue = paymentDue.reduce((sum, t) => sum + Number(t.offset_amount_paid), 0);
  const totalPaid = paid.reduce((sum, t) => sum + Number(t.offset_amount_paid), 0);

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
          <h1 className="text-3xl font-bold">KTB Reimbursements</h1>
          <p className="text-muted-foreground">Track offset payments pending reimbursement from KTB</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Payment Due</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">KES {totalDue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{paymentDue.length} tickets</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">KES {totalPaid.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{paid.length} tickets</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Offset Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">KES {(totalDue + totalPaid).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{(tickets?.length || 0)} total</p>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>LPO #</TableHead>
                <TableHead>Ticket #</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>KTB Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!tickets || tickets.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No reimbursement records yet.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.staff_name}</TableCell>
                    <TableCell>{ticket.department}</TableCell>
                    <TableCell>{ticket.lpo_number}</TableCell>
                    <TableCell>{ticket.ticket_number}</TableCell>
                    <TableCell>{ticket.origin_airport} → {ticket.destination_airport}</TableCell>
                    <TableCell>KES {Number(ticket.offset_amount_paid).toLocaleString()}</TableCell>
                    <TableCell>{ticket.payment_date ? format(new Date(ticket.payment_date), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.ktb_payment_status === 'Paid' ? 'default' : 'destructive'}>
                        {ticket.ktb_payment_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
