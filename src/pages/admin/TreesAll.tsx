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
import { Search, RefreshCw, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Tree {
  id: string;
  user_id: string;
  otot_id: string;
  num_trees: number;
  tree_type: string | null;
  status: "Waiting to be Assigned" | "Assigned" | "Sapling Planted" | "Being Mapped" | "Planted";
  planting_status: string | null;
  stakeholder_org_id: string | null;
  plant_date: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  amount_paid: number;
  created_at: string;
  users?: {
    email: string;
  };
  lodges?: {
    name: string;
  };
  organizations?: {
    name: string;
  };
}

interface StakeholderOrg {
  id: string;
  name: string;
}

export default function TreesAll() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stakeholderOrgs, setStakeholderOrgs] = useState<StakeholderOrg[]>([]);
  const [selectedTrees, setSelectedTrees] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTrees();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    fetchStakeholderOrgs();
  }, []);

  const fetchStakeholderOrgs = async () => {
    const { data } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("category", "stakeholder")
      .eq("is_active", true)
      .eq("archived", false);
    setStakeholderOrgs(data || []);
  };

  const fetchTrees = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("trees")
        .select(
          `
          *,
          users(email),
          lodges(name),
          organizations:stakeholder_org_id(name)
        `,
          { count: "exact" }
        );

      if (searchTerm) {
        query = query.or(
          `otot_id.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%,tree_type.ilike.%${searchTerm}%`
        );
      }

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;

      setTrees(data as any || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching trees:", error);
      toast.error("Failed to fetch trees");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Planted":
        return "default";
      case "Sapling Planted":
        return "secondary";
      case "Being Mapped":
        return "outline";
      case "Assigned":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const totalTreesCount = trees.reduce((sum, t) => sum + t.num_trees, 0);

  const handleAssignStakeholder = async (treeId: string, orgId: string) => {
    const { error } = await supabase
      .from("trees")
      .update({ stakeholder_org_id: orgId, planting_status: 'allocated' as any })
      .eq("id", treeId);
    if (error) {
      toast.error("Failed to assign partner");
    } else {
      toast.success("Partner assigned");
      fetchTrees();
    }
  };

  const handleBulkAssign = async (orgId: string) => {
    if (selectedTrees.size === 0) return;
    const { error } = await supabase
      .from("trees")
      .update({ stakeholder_org_id: orgId, planting_status: 'allocated' as any })
      .in("id", Array.from(selectedTrees));
    if (error) {
      toast.error("Failed to bulk assign");
    } else {
      toast.success(`${selectedTrees.size} trees assigned`);
      setSelectedTrees(new Set());
      fetchTrees();
    }
  };

  const toggleTreeSelection = (id: string) => {
    setSelectedTrees(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-primary">All Trees</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all planted trees
          </p>
        </div>
        <Button onClick={fetchTrees} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Tree Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Trees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTreesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Planted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trees.filter((t) => t.status === "Planted").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Waiting Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trees.filter((t) => t.status === "Waiting to be Assigned").length}
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
                placeholder="Search by email, OTOT ID, location, or type..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Waiting to be Assigned">
                  Waiting Assignment
                </SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Sapling Planted">Sapling Planted</SelectItem>
                <SelectItem value="Being Mapped">Being Mapped</SelectItem>
                <SelectItem value="Planted">Planted</SelectItem>
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
          ) : trees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No trees found.
            </div>
          ) : (
            <>
              {selectedTrees.size > 0 && stakeholderOrgs.length > 0 && (
                <div className="mb-4 flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{selectedTrees.size} selected</span>
                  <Select onValueChange={handleBulkAssign}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Bulk assign partner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stakeholderOrgs.map(org => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTrees(new Set(trees.map(t => t.id)));
                            } else {
                              setSelectedTrees(new Set());
                            }
                          }}
                          checked={selectedTrees.size === trees.length && trees.length > 0}
                        />
                      </TableHead>
                      <TableHead>OTOT ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Trees</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plantation Partner</TableHead>
                      <TableHead>Lodge</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Plant Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trees.map((tree) => (
                      <TableRow key={tree.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTrees.has(tree.id)}
                            onChange={() => toggleTreeSelection(tree.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {tree.otot_id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {tree.users?.email}
                        </TableCell>
                        <TableCell>{tree.num_trees}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(tree.status)}>
                            {tree.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={tree.stakeholder_org_id || "unassigned"}
                            onValueChange={(v) => handleAssignStakeholder(tree.id, v)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent>
                              {stakeholderOrgs.map(org => (
                                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{tree.lodges?.name || "N/A"}</TableCell>
                        <TableCell>
                          {tree.location_name ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {tree.location_name}
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          {tree.plant_date
                            ? new Date(tree.plant_date).toLocaleDateString()
                            : "Not planted"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(tree.amount_paid).toFixed(2)}
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
                  trees
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
