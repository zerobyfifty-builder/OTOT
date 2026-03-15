import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Ban, MoreHorizontal, Check, Eye, FileText, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface TravelAgent {
  id: string;
  name: string;
  business_name: string;
  email: string;
  username: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function InstitutionalTravelAgents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingAgent, setEditingAgent] = useState<TravelAgent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    email: '',
    username: '',
    password: '',
    contact_phone: '',
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userOrgProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const organizationId = userProfile?.organization_id;

  // Travel agents query
  const { data: agents = [], isLoading: agentsLoading, refetch: refetchAgents } = useQuery({
    queryKey: ['institutional-travel-agents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [] as TravelAgent[];
      const { data, error } = await (supabase as any)
        .from('travel_agents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      return (data || []) as TravelAgent[];
    },
    enabled: !!organizationId,
  });

  // Agent tickets query
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['institutional-agent-tickets', organizationId],
    queryFn: async () => {
      if (!organizationId) return [] as any[];
      const { data: agentsData, error: agentError } = await supabase
        .from('travel_agents' as any)
        .select('id')
        .eq('organization_id', organizationId);
      if (agentError) throw agentError;
      if (!agentsData || agentsData.length === 0) return [] as any[];
      const agentIds = (agentsData as any[]).map((a: any) => a.id);
      const { data, error } = await supabase
        .from('agent_tickets')
        .select('*, travel_agents(name, business_name)')
        .in('agent_id', agentIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Mutations
  const updateKtbStatus = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('agent_tickets')
        .update({ ktb_payment_status: 'Paid', ktb_payment_date: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutional-agent-tickets'] });
      toast({ title: 'Updated', description: 'Payment status updated to Paid' });
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
      queryClient.invalidateQueries({ queryKey: ['institutional-agent-tickets'] });
      toast({ title: 'Updated', description: 'Tree status updated to Planted' });
    },
  });

  // Agent CRUD handlers
  const handleEdit = (agent: TravelAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      business_name: agent.business_name,
      email: agent.email,
      username: agent.username || '',
      password: '',
      contact_phone: agent.contact_phone || '',
    });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({ name: '', business_name: '', email: '', username: '', password: '', contact_phone: '' });
  };

  const handleSave = async () => {
    if (!organizationId) return;
    try {
      if (editingAgent) {
        const updateData: any = {
          name: formData.name,
          business_name: formData.business_name,
          email: formData.email,
          username: formData.username || null,
          contact_phone: formData.contact_phone || null,
        };
        if (formData.password) updateData.password_hash = formData.password;
        const { error } = await supabase.from('travel_agents').update(updateData).eq('id', editingAgent.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Travel agent updated successfully' });
      } else {
        const { error: insertError } = await supabase.from('travel_agents').insert([{
          name: formData.name,
          business_name: formData.business_name,
          email: formData.email,
          username: formData.username || null,
          password_hash: '__supabase_auth__',
          contact_phone: formData.contact_phone || null,
          organization_id: organizationId,
        }]);
        if (insertError) throw insertError;

        const { data: fnData, error: fnError } = await supabase.functions.invoke('create-agent-user', {
          body: {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            business_name: formData.business_name,
            contact_phone: formData.contact_phone || null,
            organization_id: organizationId,
          }
        });

        if (fnError) {
          console.error('Edge function error:', fnError);
          toast({ title: 'Warning', description: 'Agent record created but auth account setup failed.', variant: 'destructive' });
        } else {
          toast({ title: 'Success', description: 'Travel agent created successfully.' });
        }
      }
      setEditingAgent(null);
      setIsCreating(false);
      refetchAgents();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({ title: 'Error', description: 'Failed to save travel agent', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (agent: TravelAgent) => {
    try {
      const { error } = await supabase.from('travel_agents').update({ is_active: !agent.is_active }).eq('id', agent.id);
      if (error) throw error;
      toast({ title: 'Success', description: `Agent ${agent.is_active ? 'deactivated' : 'activated'}` });
      refetchAgents();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  // Invoice generator (same as agent portal)
  const generateInvoice = (ticket: any) => {
    const agentInfo = Array.isArray(ticket.travel_agents) ? ticket.travel_agents[0] : ticket.travel_agents;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Carbon Offset Invoice", 20, 30);
    doc.setFontSize(10);
    doc.text(`Date: ${format(new Date(), "PPP")}`, 20, 45);
    doc.text(`Agent: ${agentInfo?.name || 'N/A'} (${agentInfo?.business_name || 'N/A'})`, 20, 52);
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

  // Ticket stats
  const totalTickets = tickets?.length || 0;
  const totalCO2 = tickets?.reduce((s, t) => s + Number(t.total_co2), 0) || 0;
  const paymentDue = tickets?.filter(t => t.ktb_payment_status === 'Payment Due').length || 0;
  const paymentDone = tickets?.filter(t => t.ktb_payment_status === 'Paid').length || 0;
  const treesPlanted = tickets?.filter(t => t.tree_status === 'Planted').length || 0;
  const treesToBePlanted = tickets?.filter(t => t.tree_status === 'Not Planted').length || 0;

  const isLoading = agentsLoading || ticketsLoading;

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Travel Agents</h1>
        <p className="text-muted-foreground">Manage travel agents and their carbon offset tickets</p>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList>
          <TabsTrigger value="tickets">Agent Tickets</TabsTrigger>
          <TabsTrigger value="agents">Manage Agents</TabsTrigger>
        </TabsList>

        {/* AGENT TICKETS TAB */}
        <TabsContent value="tickets" className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Tickets</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalTickets}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total CO₂ Offset</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{(totalCO2 / 1000).toFixed(1)} t</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Payments Due</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-orange-600">{paymentDue}</p></CardContent></Card>
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
                  <TableHead>Payment</TableHead>
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
        </TabsContent>

        {/* MANAGE AGENTS TAB */}
        <TabsContent value="agents" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Travel Agent
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No travel agents yet. Click "Add Travel Agent" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.business_name}</TableCell>
                      <TableCell>{agent.email}</TableCell>
                      <TableCell>{agent.username || '-'}</TableCell>
                      <TableCell>{agent.contact_phone || '-'}</TableCell>
                      <TableCell>
                        <span className={agent.is_active ? 'text-green-600' : 'text-red-600'}>
                          {agent.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(agent)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(agent)}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Agent Dialog */}
      <Dialog open={!!editingAgent || isCreating} onOpenChange={() => { setEditingAgent(null); setIsCreating(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Edit Travel Agent' : 'Create Travel Agent'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><Label>Business Name *</Label><Input value={formData.business_name} onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            <div><Label>Username *</Label><Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} /></div>
            <div><Label>{editingAgent ? 'New Password (leave blank to keep current)' : 'Password *'}</Label><Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div>
            <div><Label>Contact Phone</Label><Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} /></div>
            <Button onClick={handleSave} className="w-full">{editingAgent ? 'Update' : 'Create'} Agent</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Ticket Info Sheet */}
      <Sheet open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Ticket Information</SheetTitle>
          </SheetHeader>
          {selectedTicket && (() => {
            const agentInfo = Array.isArray(selectedTicket.travel_agents) ? selectedTicket.travel_agents[0] : selectedTicket.travel_agents;
            return (
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Agent Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField label="Agent Name" value={agentInfo?.name} />
                    <InfoField label="Business Name" value={agentInfo?.business_name} />
                  </div>
                </div>

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
                  <Button variant="outline" className="flex-1" onClick={() => generateInvoice(selectedTicket)}>
                    <FileText className="mr-2 h-4 w-4" /> Download Invoice
                  </Button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  );
}
