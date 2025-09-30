import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

interface Reimbursement {
  id: string;
  amount: number;
  request_date: string;
  status: string;
  payment_date: string | null;
  notes: string | null;
  lodges: { name: string };
}

export default function Reimbursements() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReimbursements();
  }, []);

  const fetchReimbursements = async () => {
    try {
      const { data, error } = await supabase
        .from('reimbursements')
        .select(`
          *,
          lodges (name)
        `)
        .order('request_date', { ascending: false });

      if (error) throw error;
      setReimbursements(data || []);
    } catch (error) {
      console.error('Error fetching reimbursements:', error);
      toast({ title: 'Error', description: 'Failed to fetch reimbursements', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reimbursements')
        .update({ 
          status: 'approved',
          payment_date: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Reimbursement approved' });
      fetchReimbursements();
    } catch (error) {
      console.error('Error approving reimbursement:', error);
      toast({ title: 'Error', description: 'Failed to approve reimbursement', variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reimbursements')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Reimbursement rejected' });
      fetchReimbursements();
    } catch (error) {
      console.error('Error rejecting reimbursement:', error);
      toast({ title: 'Error', description: 'Failed to reject reimbursement', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
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
      <h1 className="text-3xl font-bold">Reimbursement Requests</h1>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lodge</TableHead>
              <TableHead>Amount (KES)</TableHead>
              <TableHead>Request Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reimbursements.map((reimbursement) => (
              <TableRow key={reimbursement.id}>
                <TableCell>{reimbursement.lodges?.name}</TableCell>
                <TableCell>{reimbursement.amount.toLocaleString()}</TableCell>
                <TableCell>{new Date(reimbursement.request_date).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusBadge(reimbursement.status)}</TableCell>
                <TableCell>
                  {reimbursement.payment_date 
                    ? new Date(reimbursement.payment_date).toLocaleDateString() 
                    : '-'}
                </TableCell>
                <TableCell>{reimbursement.notes || '-'}</TableCell>
                <TableCell>
                  {reimbursement.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleApprove(reimbursement.id)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleReject(reimbursement.id)}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
