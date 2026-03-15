import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/contexts/AgentAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FileText, Download, Eye, Plus } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

export const AgentTickets = () => {
  const { agent } = useAgentAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['agent-tickets', agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_tickets')
        .select('*')
        .eq('agent_id', agent!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!agent,
  });

  const generateInvoice = (ticket: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Carbon Offset Invoice", 20, 30);
    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(), "PPP")}`, 20, 45);
    doc.text(`Agent: ${agent?.name} (${agent?.business_name})`, 20, 52);
    doc.setFontSize(12);
    doc.text("Ticket Details", 20, 68);
    doc.setFontSize(10);
    const details = [
      `Staff Name: ${ticket.staff_name}`,
      `Department: ${ticket.department}`,
      `PNR: ${ticket.pnr_number}`,
      `Ticket Number: ${ticket.ticket_number}`,
      `LPO Number: ${ticket.lpo_number}`,
      `Route: ${ticket.origin_airport} → ${ticket.destination_airport}`,
      `Travel Class: ${ticket.travel_class}`,
      `Travel Date: ${format(new Date(ticket.from_date), "PPP")}`,
      `Total CO₂: ${Math.round(ticket.total_co2).toLocaleString()} kg`,
      `Trees Needed: ${ticket.trees_needed}`,
      `Amount: KES ${Number(ticket.offset_amount_paid).toLocaleString()}`,
      `Tree Status: ${ticket.tree_status}`,
      `KTB Payment: ${ticket.ktb_payment_status}`,
    ];
    details.forEach((line, i) => doc.text(line, 20, 78 + i * 7));
    doc.save(`invoice-${ticket.ticket_number}.pdf`);
    toast({ title: "Invoice Downloaded", description: `Invoice for ticket ${ticket.ticket_number} generated.` });
  };

  const generateReceipt = (ticket: any) => {
    if (Number(ticket.offset_amount_paid) === 0) {
      toast({ title: "No Payment", description: "This ticket has no payment recorded yet.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Payment Receipt", 20, 30);
    doc.setFontSize(10);
    doc.text(`Receipt Date: ${format(new Date(), "PPP")}`, 20, 45);
    doc.text(`Agent: ${agent?.name} (${agent?.business_name})`, 20, 52);
    doc.setFontSize(12);
    doc.text("Payment Details", 20, 68);
    doc.setFontSize(10);
    const lines = [
      `Staff Name: ${ticket.staff_name}`,
      `Department: ${ticket.department}`,
      `Ticket Number: ${ticket.ticket_number}`,
      `LPO Number: ${ticket.lpo_number}`,
      `Trees Planted: ${ticket.trees_planted}`,
      `Amount Paid: KES ${Number(ticket.offset_amount_paid).toLocaleString()}`,
      `Payment Date: ${ticket.payment_date ? format(new Date(ticket.payment_date), "PPP") : "N/A"}`,
    ];
    lines.forEach((line, i) => doc.text(line, 20, 78 + i * 7));
    doc.save(`receipt-${ticket.ticket_number}.pdf`);
    toast({ title: "Receipt Downloaded", description: `Receipt for ticket ${ticket.ticket_number} generated.` });
  };

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Tickets</h1>
            <p className="text-muted-foreground">Track all booked tickets, offsets, and reimbursements</p>
          </div>
          <Button onClick={() => navigate('/agent/calculate')}><Plus className="mr-2 h-4 w-4" />New Ticket</Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>PNR</TableHead>
                <TableHead>Ticket #</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Travel Date</TableHead>
                <TableHead>CO₂ (kg)</TableHead>
                <TableHead>Trees</TableHead>
                <TableHead>Tree Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>KTB Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!tickets || tickets.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    No tickets yet. Start by calculating a carbon offset.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.staff_name}</TableCell>
                    <TableCell>{ticket.department}</TableCell>
                    <TableCell>{ticket.pnr_number}</TableCell>
                    <TableCell>{ticket.ticket_number}</TableCell>
                    <TableCell>{ticket.origin_airport} → {ticket.destination_airport}</TableCell>
                    <TableCell>{format(new Date(ticket.from_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{Math.round(Number(ticket.total_co2)).toLocaleString()}</TableCell>
                    <TableCell>{ticket.trees_needed}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.tree_status === 'Planted' ? 'default' : 'secondary'}>
                        {ticket.tree_status}
                      </Badge>
                    </TableCell>
                    <TableCell>KES {Number(ticket.offset_amount_paid).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.ktb_payment_status === 'Paid' ? 'default' : 'destructive'}>
                        {ticket.ktb_payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => generateInvoice(ticket)}>
                            <FileText className="mr-2 h-4 w-4" /> Download Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateReceipt(ticket)}>
                            <Download className="mr-2 h-4 w-4" /> Download Receipt
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
