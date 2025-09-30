import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLodgeAuth } from "@/contexts/LodgeAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const LodgeReimbursements = () => {
  const { lodge } = useLodgeAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);

  const { data: reimbursements, isLoading } = useQuery({
    queryKey: ['lodge-reimbursements', lodge?.id],
    queryFn: async () => {
      if (!lodge) return [];

      const { data, error } = await supabase
        .from('reimbursements')
        .select('*')
        .eq('lodge_id', lodge.id)
        .order('request_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!lodge,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!lodge) return;

      const documentUrls: string[] = [];

      for (const file of documents) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${lodge.id}-${Date.now()}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('reimbursement-docs')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('reimbursement-docs')
          .getPublicUrl(fileName);

        documentUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase
        .from('reimbursements')
        .insert({
          lodge_id: lodge.id,
          amount: parseFloat(amount),
          notes,
          document_urls: documentUrls,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodge-reimbursements'] });
      toast({
        title: "Success",
        description: "Reimbursement request submitted",
      });
      setIsDialogOpen(false);
      setAmount("");
      setNotes("");
      setDocuments([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit reimbursement request",
        variant: "destructive",
      });
      console.error('Reimbursement error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/lodge/dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reimbursement Requests</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Reimbursement Request</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe the reimbursement request"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="documents">Supporting Documents</Label>
                    <Input
                      id="documents"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    {documents.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {documents.length} file(s) selected
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {!reimbursements || reimbursements.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No reimbursement requests yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reimbursements.map((reimbursement) => (
                      <TableRow key={reimbursement.id}>
                        <TableCell>
                          {new Date(reimbursement.request_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>${reimbursement.amount}</TableCell>
                        <TableCell>{getStatusBadge(reimbursement.status)}</TableCell>
                        <TableCell>
                          {reimbursement.payment_date
                            ? new Date(reimbursement.payment_date).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell>{reimbursement.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
