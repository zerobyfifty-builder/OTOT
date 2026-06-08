import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

interface TouristRow {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  created_at: string;
  pledge_status: boolean;
  total_contribution: number;
  total_trees: number;
}

type SortKey = "sl" | "name" | "email" | "country" | "pledge" | "contribution" | "trees" | "joined";
type SortDir = "asc" | "desc";

export default function AllTourists() {
  const [rows, setRows] = useState<TouristRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let cancelled = false;
    const fetchRows = async () => {
      setLoading(true);
      try {
        const nonTouristRoles = [
          "super_admin",
          "owner",
          "business_partner",
          "government_partner",
          "travel_agent",
        ];

        const { data: users, error } = await supabase
          .from("users")
          .select(
            `id, user_id, email, first_name, last_name, country, created_at, pledge_status, roles(name)`
          )
          .order("created_at", { ascending: false })
          .limit(2000);
        if (error) throw error;

        const tourists = (users || []).filter((u: any) => {
          const roleName = u.roles?.name;
          return !roleName || !nonTouristRoles.includes(roleName);
        });

        // Aggregate contributions & trees from trees table
        const userIds = tourists.map((u: any) => u.user_id).filter(Boolean);
        const aggMap = new Map<string, { contrib: number; trees: number }>();
        if (userIds.length) {
          const chunkSize = 200;
          for (let i = 0; i < userIds.length; i += chunkSize) {
            const chunk = userIds.slice(i, i + chunkSize);
            const { data: trees, error: tErr } = await supabase
              .from("trees")
              .select("user_id, amount_paid, num_trees")
              .in("user_id", chunk);
            if (tErr) throw tErr;
            (trees || []).forEach((t: any) => {
              const k = t.user_id;
              if (!k) return;
              const cur = aggMap.get(k) || { contrib: 0, trees: 0 };
              cur.contrib += Number(t.amount_paid) || 0;
              cur.trees += Number(t.num_trees) || 0;
              aggMap.set(k, cur);
            });
          }
        }

        const merged: TouristRow[] = tourists.map((u: any) => {
          const agg = aggMap.get(u.user_id) || { contrib: 0, trees: 0 };
          return {
            id: u.id,
            user_id: u.user_id,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            country: u.country,
            created_at: u.created_at,
            pledge_status: u.pledge_status,
            total_contribution: agg.contrib,
            total_trees: agg.trees,
          };
        });

        if (!cancelled) setRows(merged);
      } catch (e: any) {
        toast.error(e.message || "Failed to load tourists");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchRows();
    return () => {
      cancelled = true;
    };
  }, []);

  const fullName = (r: TouristRow) =>
    [r.first_name, r.last_name].filter(Boolean).join(" ").trim();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email?.toLowerCase().includes(q) ||
        fullName(r).toLowerCase().includes(q) ||
        (r.country || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let va: any;
      let vb: any;
      switch (sortKey) {
        case "name":
          va = fullName(a).toLowerCase();
          vb = fullName(b).toLowerCase();
          break;
        case "email":
          va = a.email?.toLowerCase() || "";
          vb = b.email?.toLowerCase() || "";
          break;
        case "country":
          va = (a.country || "").toLowerCase();
          vb = (b.country || "").toLowerCase();
          break;
        case "pledge":
          va = a.pledge_status ? 1 : 0;
          vb = b.pledge_status ? 1 : 0;
          break;
        case "contribution":
          va = a.total_contribution;
          vb = b.total_contribution;
          break;
        case "trees":
          va = a.total_trees;
          vb = b.total_trees;
          break;
        case "joined":
        default:
          va = new Date(a.created_at).getTime();
          vb = new Date(b.created_at).getTime();
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "joined" || key === "contribution" || key === "trees" ? "desc" : "asc");
    }
    setPage(1);
  };

  const SortBtn = ({ k, label, className = "" }: { k: SortKey; label: string; className?: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={`inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors ${className}`}
    >
      {label}
      {sortKey === k ? (
        sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, country…"
              className="pl-8"
            />
          </div>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto tabular-nums">
            {sorted.length} tourist{sorted.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Sl No</TableHead>
                  <TableHead><SortBtn k="name" label="Name" /></TableHead>
                  <TableHead><SortBtn k="email" label="Email" /></TableHead>
                  <TableHead><SortBtn k="country" label="Country" /></TableHead>
                  <TableHead><SortBtn k="pledge" label="Pledge" /></TableHead>
                  <TableHead className="text-right"><SortBtn k="contribution" label="Contribution" className="ml-auto" /></TableHead>
                  <TableHead className="text-right"><SortBtn k="trees" label="Trees" className="ml-auto" /></TableHead>
                  <TableHead><SortBtn k="joined" label="Joined" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No tourists found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((r, idx) => {
                    const d = new Date(r.created_at);
                    const name = fullName(r) || "—";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.country || "—"}</TableCell>
                        <TableCell>
                          {r.pledge_status ? (
                            <Badge variant="default">Pledged</Badge>
                          ) : (
                            <Badge variant="outline">—</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.total_contribution ? `$${r.total_contribution.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.total_trees || "—"}
                        </TableCell>
                        <TableCell className="text-xs leading-tight">
                          <div>{d.toLocaleDateString()}</div>
                          <div className="text-muted-foreground">{d.toLocaleTimeString()}</div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {sorted.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground tabular-nums">
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
                </p>
                {totalPages > 1 && (
                  <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        let pNum = i + 1;
                        if (totalPages > 5) {
                          const start = Math.min(Math.max(1, currentPage - 2), totalPages - 4);
                          pNum = start + i;
                        }
                        return (
                          <PaginationItem key={pNum}>
                            <PaginationLink
                              isActive={currentPage === pNum}
                              onClick={() => setPage(pNum)}
                              className="cursor-pointer"
                            >
                              {pNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
