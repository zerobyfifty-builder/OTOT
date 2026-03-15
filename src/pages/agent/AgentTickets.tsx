import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/contexts/AgentAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoreHorizontal, FileText, Eye, Check, Plus } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const AgentTickets = () => {
  const { agent } = useAgentAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

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

  // Fetch the agent's organization (institutional partner) for billing address
  const { data: organization } = useQuery({
    queryKey: ['agent-organization', agent?.organization_id],
    queryFn: async () => {
      if (!agent?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', agent.organization_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!agent?.organization_id,
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
      queryClient.invalidateQueries({ queryKey: ['agent-tickets'] });
      toast({ title: 'Updated', description: 'Payment status updated to Paid' });
    },
  });

  const generateInvoice = (ticket: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice", 20, 30);

    // Invoice metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice number", 20, 50);
    doc.text("Date of issue", 20, 57);
    doc.text("Date due", 20, 64);

    doc.setFont("helvetica", "normal");
    const invoiceNumber = `INV-${ticket.ticket_number}`;
    doc.text(invoiceNumber, 65, 50);
    doc.text(format(new Date(ticket.created_at), "MMMM dd, yyyy"), 65, 57);
    doc.text(format(new Date(ticket.created_at), "MMMM dd, yyyy"), 65, 64);

    // From address (Travel Agent)
    const fromY = 82;
    doc.setFont("helvetica", "bold");
    doc.text(agent?.business_name || "Travel Agent", 20, fromY);
    doc.setFont("helvetica", "normal");
    doc.text(agent?.name || "", 20, fromY + 7);
    doc.text(agent?.email || "", 20, fromY + 14);
    if (agent?.contact_phone) {
      doc.text(agent.contact_phone, 20, fromY + 21);
    }

    // Bill To (Institutional Partner / KTB)
    const billToX = pageWidth / 2 + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Bill to", billToX, fromY);
    doc.setFont("helvetica", "normal");

    if (organization) {
      const address = organization.address as any;
      const billToLines = [
        organization.name,
        organization.contact_person || '',
        address?.street || address?.line1 || '',
        address?.city || '',
        address?.country || '',
        organization.contact_email || '',
      ].filter(Boolean);
      billToLines.forEach((line, i) => {
        doc.text(line, billToX, fromY + 7 + i * 7);
      });
    } else {
      doc.text("Kenya Tourism Board", billToX, fromY + 7);
      doc.text("Nairobi, Kenya", billToX, fromY + 14);
    }

    // Amount due line
    const amountDueY = 130;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(
      `KES ${Number(ticket.offset_amount_paid).toLocaleString()} due ${format(new Date(ticket.created_at), "MMMM dd, yyyy")}`,
      20,
      amountDueY
    );

    // Description subtitle
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Carbon Offset - ${ticket.origin_airport} → ${ticket.destination_airport}`, 20, amountDueY + 12);

    // Table
    autoTable(doc, {
      startY: amountDueY + 22,
      head: [["Description", "Qty", "Unit price", "Amount"]],
      body: [
        [
          `Carbon offset for ${ticket.staff_name}\n${ticket.origin_airport} → ${ticket.destination_airport} (${ticket.travel_class})\nPNR: ${ticket.pnr_number} | LPO: ${ticket.lpo_number}\nCO₂: ${Math.round(Number(ticket.total_co2)).toLocaleString()} kg`,
          String(ticket.trees_needed),
          `KES ${ticket.trees_needed > 0 ? Math.round(Number(ticket.offset_amount_paid) / ticket.trees_needed).toLocaleString() : '0'}`,
          `KES ${Number(ticket.offset_amount_paid).toLocaleString()}`,
        ],
      ],
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fontStyle: "bold", fillColor: [255, 255, 255], textColor: [80, 80, 80], lineWidth: { bottom: 0.5 }, lineColor: [200, 200, 200] },
      bodyStyles: { textColor: [40, 40, 40] },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { halign: "right", cellWidth: 20 },
        2: { halign: "right", cellWidth: 35 },
        3: { halign: "right", cellWidth: 35 },
      },
    });

    // Totals
    const finalY = (doc as any).lastAutoTable?.finalY || amountDueY + 60;
    const totalsX = pageWidth - 20;
    const subtotalY = finalY + 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", totalsX - 50, subtotalY);
    doc.text(`KES ${Number(ticket.offset_amount_paid).toLocaleString()}`, totalsX, subtotalY, { align: "right" });

    doc.text("Total", totalsX - 50, subtotalY + 8);
    doc.text(`KES ${Number(ticket.offset_amount_paid).toLocaleString()}`, totalsX, subtotalY + 8, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text("Amount due", totalsX - 50, subtotalY + 18);
    doc.text(`KES ${Number(ticket.offset_amount_paid).toLocaleString()}`, totalsX, subtotalY + 18, { align: "right" });

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200, 200, 200);
    doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Page 1 of 1", pageWidth - 20, pageHeight - 15, { align: "right" });

    doc.save(`invoice-${ticket.ticket_number}.pdf`);
    toast({ title: "Invoice Downloaded", description: `Invoice for ticket ${ticket.ticket_number} generated.` });
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
                          <DropdownMenuItem onClick={() => setSelectedTicket(ticket)}>
                            <Eye className="mr-2 h-4 w-4" /> View Ticket Info
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateInvoice(ticket)}>
                            <FileText className="mr-2 h-4 w-4" /> View Invoice
                          </DropdownMenuItem>
                          {ticket.ktb_payment_status === 'Payment Due' && (
                            <DropdownMenuItem onClick={() => updateKtbStatus.mutate(ticket.id)}>
                              <Check className="mr-2 h-4 w-4" /> Mark as Paid
                            </DropdownMenuItem>
                          )}
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

      {/* View Ticket Info Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ticket Information</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Staff Name</p>
                  <p className="font-medium">{selectedTicket.staff_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedTicket.department}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">PNR Number</p>
                  <p className="font-medium">{selectedTicket.pnr_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ticket Number</p>
                  <p className="font-medium">{selectedTicket.ticket_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">LPO Number</p>
                  <p className="font-medium">{selectedTicket.lpo_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Issue Date</p>
                  <p className="font-medium">{format(new Date(selectedTicket.ticket_issue_date), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Route</p>
                  <p className="font-medium">{selectedTicket.origin_airport} → {selectedTicket.destination_airport}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Travel Class</p>
                  <p className="font-medium">{selectedTicket.travel_class}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Travel Date</p>
                  <p className="font-medium">{format(new Date(selectedTicket.from_date), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Return</p>
                  <p className="font-medium">{selectedTicket.is_return ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Travelers</p>
                  <p className="font-medium">{selectedTicket.num_travelers}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Accommodation</p>
                  <p className="font-medium">{selectedTicket.accommodation_type || 'None'}</p>
                </div>
              </div>
              <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Flight CO₂</p>
                  <p className="font-medium">{Math.round(Number(selectedTicket.flight_co2)).toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Accommodation CO₂</p>
                  <p className="font-medium">{Math.round(Number(selectedTicket.accommodation_co2)).toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total CO₂</p>
                  <p className="font-medium">{Math.round(Number(selectedTicket.total_co2)).toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trees Needed</p>
                  <p className="font-medium">{selectedTicket.trees_needed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount Paid</p>
                  <p className="font-medium">KES {Number(selectedTicket.offset_amount_paid).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trees Planted</p>
                  <p className="font-medium">{selectedTicket.trees_planted}</p>
                </div>
              </div>
              <div className="border-t pt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Tree Status</p>
                  <Badge variant={selectedTicket.tree_status === 'Planted' ? 'default' : 'secondary'}>
                    {selectedTicket.tree_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">KTB Payment</p>
                  <Badge variant={selectedTicket.ktb_payment_status === 'Paid' ? 'default' : 'destructive'}>
                    {selectedTicket.ktb_payment_status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
