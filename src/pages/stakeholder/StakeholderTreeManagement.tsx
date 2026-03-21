import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TreePine } from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { format } from "date-fns";

interface Tree {
  id: string;
  otot_id: string;
  num_trees: number;
  tree_type: string | null;
  status: string;
  planting_status: string | null;
  stakeholder_org_id: string | null;
  plant_date: string | null;
  location_name: string | null;
  amount_paid: number;
  created_at: string;
  users?: { email: string; first_name: string | null; last_name: string | null };
  lodges?: { name: string } | null;
}

const statusColors: Record<string, string> = {
  "Waiting to be Assigned": "bg-yellow-100 text-yellow-800",
  "Assigned": "bg-blue-100 text-blue-800",
  "Sapling Planted": "bg-emerald-100 text-emerald-800",
  "Being Mapped": "bg-purple-100 text-purple-800",
  "Planted": "bg-green-100 text-green-800",
};

export function StakeholderTreeManagement() {
  const { isEnabled, isLoading: permLoading } = useModulePermissions("tree_management");
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trees")
      .select("*, lodges(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error && data) {
      setTrees(data as any);
    } else {
      console.error("Error fetching trees:", error);
    }
    setLoading(false);
  };

  const filtered = trees.filter((t) => {
    const matchSearch =
      !search ||
      t.otot_id?.toLowerCase().includes(search.toLowerCase()) ||
      t.users?.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.location_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
          <TreePine className="h-6 w-6 text-green-700" /> Tree Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage all trees across the platform</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by OTOT ID, email, location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Waiting to be Assigned">Waiting to be Assigned</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Sapling Planted">Sapling Planted</SelectItem>
                <SelectItem value="Being Mapped">Being Mapped</SelectItem>
                <SelectItem value="Planted">Planted</SelectItem>
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
                    <TableHead>OTOT ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Trees</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Lodge</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No trees found</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((tree) => (
                      <TableRow key={tree.id}>
                        <TableCell className="font-mono text-xs">{tree.otot_id}</TableCell>
                        <TableCell className="text-sm">
                          {tree.users?.first_name || tree.users?.last_name
                            ? `${tree.users.first_name || ""} ${tree.users.last_name || ""}`.trim()
                            : tree.users?.email || "—"}
                        </TableCell>
                        <TableCell>{tree.num_trees}</TableCell>
                        <TableCell>{tree.tree_type || "—"}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[tree.status] || "bg-gray-100 text-gray-800"} variant="secondary">
                            {tree.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{tree.location_name || "—"}</TableCell>
                        <TableCell className="text-sm">{tree.lodges?.name || "—"}</TableCell>
                        <TableCell className="text-sm">{format(new Date(tree.created_at), "dd MMM yyyy")}</TableCell>
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

export default StakeholderTreeManagement;
