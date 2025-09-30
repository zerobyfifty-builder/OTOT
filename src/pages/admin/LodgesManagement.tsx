import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Ban } from 'lucide-react';

interface Lodge {
  id: string;
  name: string;
  location: string;
  contact_email: string | null;
  contact_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

export default function LodgesManagement() {
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLodge, setEditingLodge] = useState<Lodge | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    contact_email: '',
    contact_phone: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    fetchLodges();
  }, []);

  const fetchLodges = async () => {
    try {
      const { data, error } = await supabase
        .from('lodges')
        .select('*')
        .order('name');

      if (error) throw error;
      setLodges(data || []);
    } catch (error) {
      console.error('Error fetching lodges:', error);
      toast({ title: 'Error', description: 'Failed to fetch lodges', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lodge: Lodge) => {
    setEditingLodge(lodge);
    setFormData({
      name: lodge.name,
      location: lodge.location,
      contact_email: lodge.contact_email || '',
      contact_phone: lodge.contact_phone || '',
      latitude: lodge.latitude?.toString() || '',
      longitude: lodge.longitude?.toString() || '',
    });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      location: '',
      contact_email: '',
      contact_phone: '',
      latitude: '',
      longitude: '',
    });
  };

  const handleSave = async () => {
    try {
      const lodgeData = {
        name: formData.name,
        location: formData.location,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      if (editingLodge) {
        const { error } = await supabase
          .from('lodges')
          .update(lodgeData)
          .eq('id', editingLodge.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Lodge updated successfully' });
      } else {
        const { error } = await supabase
          .from('lodges')
          .insert([lodgeData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Lodge created successfully' });
      }

      setEditingLodge(null);
      setIsCreating(false);
      fetchLodges();
    } catch (error) {
      console.error('Error saving lodge:', error);
      toast({ title: 'Error', description: 'Failed to save lodge', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (lodge: Lodge) => {
    try {
      const { error } = await supabase
        .from('lodges')
        .update({ is_active: !lodge.is_active })
        .eq('id', lodge.id);

      if (error) throw error;
      toast({ title: 'Success', description: `Lodge ${lodge.is_active ? 'deactivated' : 'activated'}` });
      fetchLodges();
    } catch (error) {
      console.error('Error toggling lodge status:', error);
      toast({ title: 'Error', description: 'Failed to update lodge status', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Lodge Management</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lodge
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Contact Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lodges.map((lodge) => (
              <TableRow key={lodge.id}>
                <TableCell>{lodge.name}</TableCell>
                <TableCell>{lodge.location}</TableCell>
                <TableCell>{lodge.contact_email || '-'}</TableCell>
                <TableCell>{lodge.contact_phone || '-'}</TableCell>
                <TableCell>
                  <span className={lodge.is_active ? 'text-green-600' : 'text-red-600'}>
                    {lodge.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(lodge)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleToggleActive(lodge)}
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingLodge || isCreating} onOpenChange={() => { setEditingLodge(null); setIsCreating(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLodge ? 'Edit Lodge' : 'Create Lodge'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editingLodge ? 'Update' : 'Create'} Lodge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
