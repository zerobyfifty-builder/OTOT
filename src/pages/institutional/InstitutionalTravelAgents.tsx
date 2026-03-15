import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Ban } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
  const [editingAgent, setEditingAgent] = useState<TravelAgent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    email: '',
    username: '',
    password: '',
    contact_phone: '',
  });

  // Get user's organization_id
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

  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ['institutional-travel-agents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('travel_agents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');
      if (error) throw error;
      return data as TravelAgent[];
    },
    enabled: !!organizationId,
  });

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
        const { error } = await supabase.from('travel_agents').insert([{
          name: formData.name,
          business_name: formData.business_name,
          email: formData.email,
          username: formData.username || null,
          password_hash: formData.password,
          contact_phone: formData.contact_phone || null,
          organization_id: organizationId,
        }]);
        if (error) throw error;
        toast({ title: 'Success', description: 'Travel agent created successfully. They can now log in with their credentials.' });
      }
      setEditingAgent(null);
      setIsCreating(false);
      refetch();
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
      refetch();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Travel Agents</h1>
          <p className="text-muted-foreground">Manage travel agents for your carbon offset program</p>
        </div>
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
    </div>
  );
}
