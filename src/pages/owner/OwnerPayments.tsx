import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, CreditCard, DollarSign, Clock, CheckCircle } from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { format } from "date-fns";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_method: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  organizations?: { name: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export function OwnerPayments() {
  const { isEnabled, isLoading: permLoading } = useModulePermissions("payment_management");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partner_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) setTransactions(data as any);
    setLoading(false);
  };

  const filtered = transactions.filter((t) => {
    const matchSearch =
      !search ||
      t.transaction_type?.toLowerCase().includes(search.toLowerCase()) ||
      t.notes?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.payment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAmount = filtered.reduce((s, t) => s + Number(t.amount || 0), 0);
  const pendingCount = transactions.filter((t) => t.payment_status === "pending").length;
  const paidCount = transactions.filter((t) => t.payment_status === "paid").length;

  if (permLoading) return <Skeleton className="h-64 w-full m-8" />;

  if (!isEnabled) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">You do not have access to this module.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" /> Payment Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage all financial transactions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-xl font-bold">${totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold">{paidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No transactions found</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="capitalize">{tx.transaction_type?.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-medium">{Number(tx.amount).toLocaleString()}</TableCell>
                        <TableCell>{tx.currency || "USD"}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[tx.payment_status] || "bg-gray-100 text-gray-800"} variant="secondary">
                            {tx.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{tx.payment_method || "—"}</TableCell>
                        <TableCell className="text-sm">{tx.payment_date ? format(new Date(tx.payment_date), "dd MMM yyyy") : "—"}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{tx.notes || "—"}</TableCell>
                        <TableCell className="text-sm">{format(new Date(tx.created_at), "dd MMM yyyy")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OwnerPayments;
