import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Eye, Pencil } from 'lucide-react';

interface Tree {
  id: string;
  otot_id: string;
  num_trees: number;
  created_at: string;
  status: string;
  lodge_id: string | null;
  latitude: number | null;
  longitude: number | null;
  plant_date: string | null;
  tree_type: string | null;
  location_name: string | null;
  user_id: string;
}

export default function TreesManagement() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [lodges, setLodges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTree, setEditingTree] = useState<Tree | null>(null);
  const [formData, setFormData] = useState({
    status: '',
    lodge_id: '',
    latitude: '',
    longitude: '',
    plant_date: '',
    tree_type: '',
    location_name: '',
  });

  useEffect(() => {
    fetchTrees();
    fetchLodges();
  }, []);

  const fetchTrees = async () => {
    try {
      const { data: treesData, error: treesError } = await supabase
        .from('trees')
        .select('*')
        .order('created_at', { ascending: false });

      if (treesError) throw treesError;
      setTrees(treesData || []);
    } catch (error) {
      console.error('Error fetching trees:', error);
      toast({ title: 'Error', description: 'Failed to fetch trees', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLodges = async () => {
    try {
      const { data, error } = await supabase
        .from('lodges')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setLodges(data || []);
    } catch (error) {
      console.error('Error fetching lodges:', error);
    }
  };

  const handleEdit = (tree: Tree) => {
    setEditingTree(tree);
    setFormData({
      status: tree.status || '',
      lodge_id: tree.lodge_id || '',
      latitude: tree.latitude?.toString() || '',
      longitude: tree.longitude?.toString() || '',
      plant_date: tree.plant_date || '',
      tree_type: tree.tree_type || '',
      location_name: tree.location_name || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingTree) return;

    try {
      const updateData: any = {
        status: formData.status,
        lodge_id: formData.lodge_id || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        plant_date: formData.plant_date || null,
        tree_type: formData.tree_type || null,
        location_name: formData.location_name || null,
      };

      const { error } = await supabase
        .from('trees')
        .update(updateData)
        .eq('id', editingTree.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Tree updated successfully' });
      setEditingTree(null);
      fetchTrees();
    } catch (error) {
      console.error('Error updating tree:', error);
      toast({ title: 'Error', description: 'Failed to update tree', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Waiting to be Assigned': 'bg-yellow-500',
      'Assigned': 'bg-orange-500',
      'Sapling Planted': 'bg-green-400',
      'Being Mapped': 'bg-blue-500',
      'View Location': 'bg-green-600',
    };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
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
      <h1 className="text-3xl font-bold">Trees Management</h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Email</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>No. of Trees</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lodge</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trees.map((tree) => (
              <TableRow key={tree.id}>
                <TableCell>{tree.user_id}</TableCell>
                <TableCell>{tree.otot_id}</TableCell>
                <TableCell>{tree.num_trees}</TableCell>
                <TableCell>{new Date(tree.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusBadge(tree.status)}</TableCell>
                <TableCell>
                  {tree.lodge_id ? lodges.find(l => l.id === tree.lodge_id)?.name : '-'}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(tree)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingTree} onOpenChange={() => setEditingTree(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Tree Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Waiting to be Assigned">Waiting to be Assigned</SelectItem>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Sapling Planted">Sapling Planted</SelectItem>
                  <SelectItem value="Being Mapped">Being Mapped</SelectItem>
                  <SelectItem value="Planted">Planted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Lodge</Label>
              <Select value={formData.lodge_id} onValueChange={(value) => setFormData({ ...formData, lodge_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lodge" />
                </SelectTrigger>
                <SelectContent>
                  {lodges.map((lodge) => (
                    <SelectItem key={lodge.id} value={lodge.id}>{lodge.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div>
              <Label>Plant Date</Label>
              <Input
                type="date"
                value={formData.plant_date}
                onChange={(e) => setFormData({ ...formData, plant_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Tree Type</Label>
              <Input
                value={formData.tree_type}
                onChange={(e) => setFormData({ ...formData, tree_type: e.target.value })}
              />
            </div>

            <div>
              <Label>Location Name</Label>
              <Input
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              />
            </div>

            <Button onClick={handleUpdate} className="w-full">Update Tree</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
