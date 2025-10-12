import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ArrowUpDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Tree {
  id: string;
  user_email: string;
  tree_type: string | null;
  num_trees: number;
  status: string;
  plant_date: string | null;
  location_name: string | null;
  amount_paid: number;
  created_at: string;
}

interface TreesTableProps {
  trees: Tree[];
  isLoading: boolean;
}

const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes("planted")) return "default";
  if (statusLower.includes("assign")) return "secondary";
  if (statusLower.includes("progress")) return "outline";
  return "secondary";
};

export const TreesTable = ({ trees, isLoading }: TreesTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Tree>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Get unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    if (!trees) return [];
    return Array.from(new Set(trees.map(t => t.status))).sort();
  }, [trees]);

  // Filter trees based on search query and status
  const filteredTrees = useMemo(() => {
    if (!trees) return [];
    
    return trees.filter((tree) => {
      const matchesSearch = !searchQuery || 
        tree.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tree.tree_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tree.location_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || tree.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [trees, searchQuery, statusFilter]);

  // Sort filtered trees
  const sortedTrees = useMemo(() => {
    const sorted = [...filteredTrees].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === "asc"
        ? (aValue > bValue ? 1 : -1)
        : (bValue > aValue ? 1 : -1);
    });
    
    return sorted;
  }, [filteredTrees, sortField, sortDirection]);

  // Paginate sorted trees
  const paginatedTrees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedTrees.slice(startIndex, startIndex + pageSize);
  }, [sortedTrees, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedTrees.length / pageSize);

  const handleSort = (field: keyof Tree) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, type, location..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={pageSize.toString()} onValueChange={(value) => {
          setPageSize(Number(value));
          setCurrentPage(1);
        }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 rows</SelectItem>
            <SelectItem value="25">25 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("user_email")} className="h-8 px-2">
                  Tourist
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("tree_type")} className="h-8 px-2">
                  Tree Type
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleSort("num_trees")} className="h-8 px-2">
                  Quantity
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("status")} className="h-8 px-2">
                  Status
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("plant_date")} className="h-8 px-2">
                  Plant Date
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("location_name")} className="h-8 px-2">
                  Location
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleSort("amount_paid")} className="h-8 px-2">
                  Amount
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("created_at")} className="h-8 px-2">
                  Created
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTrees.length > 0 ? (
              paginatedTrees.map((tree) => (
                <TableRow key={tree.id}>
                  <TableCell className="font-medium">{tree.user_email}</TableCell>
                  <TableCell>{tree.tree_type || "Not specified"}</TableCell>
                  <TableCell className="text-right">{tree.num_trees}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(tree.status)}>
                      {tree.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tree.plant_date ? format(new Date(tree.plant_date), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>{tree.location_name || "—"}</TableCell>
                  <TableCell className="text-right">${Number(tree.amount_paid).toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(tree.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No trees found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * pageSize + 1, sortedTrees.length)} to{" "}
            {Math.min(currentPage * pageSize, sortedTrees.length)} of {sortedTrees.length} trees
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
