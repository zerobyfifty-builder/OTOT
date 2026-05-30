import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgentAuth } from "@/contexts/AgentAuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MoreHorizontal, FileText, Eye, Check, Plus } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { generateInvoice } from "@/utils/invoiceGenerator";

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

  const { data: agentRecord } = useQuery({
    queryKey: ['agent-full-record', agent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('travel_agents')
        .select('*, organizations(*)')
        .eq('id', agent!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!agent?.id,
  });

  const organization = agentRecord?.organizations as any;

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

  const handleGenerateInvoice = (ticket: any) => {
    generateInvoice({
      ticket,
      agentName: agent?.name,
      agentBusinessName: agent?.business_name,
      agentEmail: agent?.email,
      agentPhone: agentRecord?.contact_phone || undefined,
      organization,
    });
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
                <TableHead>Contribution ID</TableHead>
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
                          <DropdownMenuItem onClick={() => handleGenerateInvoice(ticket)}>
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

      {/* View Ticket Info Sheet - matches Institutional Portal */}
      <Sheet open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Ticket Information</SheetTitle>
          </SheetHeader>
          {selectedTicket && (
            <div className="mt-6 space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ticket Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="PNR Number" value={selectedTicket.pnr_number} />
                  <InfoField label="Ticket Number" value={selectedTicket.ticket_number} />
                  <InfoField label="LPO Number" value={selectedTicket.lpo_number} />
                  <InfoField label="Ticket Issue Date" value={selectedTicket.ticket_issue_date ? format(new Date(selectedTicket.ticket_issue_date), "dd MMM yyyy") : '-'} />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Travel Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Staff Name" value={selectedTicket.staff_name} />
                  <InfoField label="Department" value={selectedTicket.department} />
                  <InfoField label="Origin" value={selectedTicket.origin_airport} />
                  <InfoField label="Destination" value={selectedTicket.destination_airport} />
                  <InfoField label="Travel Class" value={selectedTicket.travel_class} />
                  <InfoField label="Return Flight" value={selectedTicket.is_return ? 'Yes' : 'No'} />
                  <InfoField label="No. of Travelers" value={String(selectedTicket.num_travelers)} />
                  <InfoField label="From Date" value={format(new Date(selectedTicket.from_date), "dd MMM yyyy")} />
                  {selectedTicket.to_date && <InfoField label="To Date" value={format(new Date(selectedTicket.to_date), "dd MMM yyyy")} />}
                  {selectedTicket.accommodation_type && <InfoField label="Accommodation" value={selectedTicket.accommodation_type} />}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Carbon Offset</h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Flight CO₂" value={`${Math.round(Number(selectedTicket.flight_co2)).toLocaleString()} kg`} />
                  <InfoField label="Accommodation CO₂" value={`${Math.round(Number(selectedTicket.accommodation_co2)).toLocaleString()} kg`} />
                  <InfoField label="Total CO₂" value={`${Math.round(Number(selectedTicket.total_co2)).toLocaleString()} kg`} />
                  <InfoField label="Trees Needed" value={String(selectedTicket.trees_needed)} />
                  <InfoField label="Trees Planted" value={String(selectedTicket.trees_planted)} />
                  <InfoField label="Offset Amount" value={`KES ${Number(selectedTicket.offset_amount_paid).toLocaleString()}`} />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Status</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Tree Status</p>
                    <Badge variant={selectedTicket.tree_status === 'Planted' ? 'default' : 'secondary'}>{selectedTicket.tree_status}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">KTB Payment</p>
                    <Badge variant={selectedTicket.ktb_payment_status === 'Paid' ? 'default' : 'destructive'}>{selectedTicket.ktb_payment_status}</Badge>
                  </div>
                  {selectedTicket.ktb_payment_date && <InfoField label="KTB Payment Date" value={format(new Date(selectedTicket.ktb_payment_date), "dd MMM yyyy")} />}
                  {selectedTicket.payment_reference && <InfoField label="Payment Ref" value={selectedTicket.payment_reference} />}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => handleGenerateInvoice(selectedTicket)}>
                  <FileText className="mr-2 h-4 w-4" /> Download Invoice
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  );
}
