import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  user_id: string;
  users?: {
    email: string;
  };
  amount_paid: number;
  purchase_type: "One-time" | "Subscription";
  num_trees: number;
  otot_id: string;
  tree_type: string | null;
  created_at: string;
}

export default function FinancialTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, pageSize, searchTerm, typeFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("trees")
        .select(
          `
          id,
          user_id,
          amount_paid,
          purchase_type,
          created_at,
          otot_id,
          num_trees,
          tree_type,
          users(email)
        `,
          { count: "exact" }
        );

      if (searchTerm) {
        query = query.ilike("otot_id", `%${searchTerm}%`);
      }

      if (typeFilter && typeFilter !== "all") {
        query = query.eq("purchase_type", typeFilter as "One-time" | "Subscription");
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;

      setTransactions(data as any || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const totalRevenue = transactions.reduce(
    (sum, t) => sum + Number(t.amount_paid),
    0
  );

  const exportTransactions = () => {
    const csv = [
      ["Date", "User Email", "OTOT ID", "Trees", "Type", "Amount"].join(","),
      ...transactions.map((t) =>
        [
          new Date(t.created_at).toLocaleDateString(),
          t.users?.email,
          t.otot_id || t.id,
          t.num_trees || 1,
          t.purchase_type,
          `$${Number(t.amount_paid).toFixed(2)}`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Transactions exported successfully");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-primary">
            Financial Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            All tree planting transactions and revenue
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportTransactions} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchTransactions} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Current Page Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Trees Planted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.reduce((sum, t) => sum + (t.num_trees || 1), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or OTOT ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tree_only">Tree Only</SelectItem>
                <SelectItem value="tree_and_trip">Tree & Trip</SelectItem>
                <SelectItem value="trip_offset">Trip Offset</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found.
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User Email</TableHead>
                      <TableHead>OTOT ID</TableHead>
                      <TableHead>Trees</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tree Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {transaction.users?.email}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {transaction.otot_id || transaction.id.substring(0, 8)}
                        </TableCell>
                        <TableCell>{transaction.num_trees || 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.purchase_type.replace(/-/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.tree_type || "N/A"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(transaction.amount_paid).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
                  transactions
                </p>
                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
