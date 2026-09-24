import { useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { roleLabel } from "@/lib/portal";
import { shortDate, usd } from "@/lib/format";
import { PortalPage } from "@/components/portal/PortalUI";
import { AdminSpinner, TablePagination } from "@/components/admin/TablePagination";
import { usePagination } from "@/components/admin/usePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AppRole } from "@/types/otot";

const ROLE_FILTERS: { value: string; label: string; roles?: AppRole[] }[] = [
  { value: "all", label: "All Roles" },
  { value: "tourist", label: "Tourists", roles: ["tourist"] },
  { value: "ministry", label: "Ministry", roles: ["ministry_admin", "ministry_user"] },
  { value: "partner", label: "Plantation Partners", roles: ["partner_admin", "partner_agent"] },
  { value: "super_admin", label: "Super Admins", roles: ["super_admin"] },
];

const PAGE_SIZES = [10, 25, 50, 100];

function roleVariant(role: AppRole): "default" | "secondary" | "outline" | "destructive" {
  if (role === "super_admin") return "destructive";
  if (role === "tourist") return "secondary";
  return "default";
}

export default function AdminUsers() {
  const { state, loading, refresh } = useStore();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const contributions = useMemo(() => {
    const totals = new Map<string, number>();
    for (const d of state.donations) {
      if (d.status === "paid") totals.set(d.userId, (totals.get(d.userId) ?? 0) + d.amount);
    }
    return totals;
  }, [state.donations]);

  const users = useMemo(() => {
    const roles = ROLE_FILTERS.find((f) => f.value === roleFilter)?.roles;
    const q = search.trim().toLowerCase();
    return state.users
      .filter(
        (u) =>
          (!roles || roles.includes(u.role)) &&
          (!q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)),
      )
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [state.users, search, roleFilter]);

  const pager = usePagination(users, 10);

  return (
    <PortalPage
      tone="admin"
      title="All Users"
      subtitle="Manage tourist, ministry, and plantation partner accounts across the platform"
      actions={
        <Button
          variant="outline"
          size="icon"
          title="Refresh"
          aria-label="Refresh"
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true);
            try {
              await refresh();
            } catch (err) {
              toast.error(apiErrorMessage(err));
            } finally {
              setRefreshing(false);
            }
          }}
        >
          <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  pager.resetPage();
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value);
                pager.resetPage();
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pager.pageSize.toString()} onValueChange={(value) => pager.setPageSize(Number(value))}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <AdminSpinner />
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users found.</div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Total Contribution</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pager.pageRows.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={roleVariant(u.role)}>{roleLabel(u.role)}</Badge>
                        </TableCell>
                        <TableCell>{usd(contributions.get(u.id) ?? 0)}</TableCell>
                        <TableCell>{u.createdAt ? shortDate(u.createdAt) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                currentPage={pager.currentPage}
                pageSize={pager.pageSize}
                totalCount={pager.totalCount}
                noun="users"
                onPageChange={pager.setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </PortalPage>
  );
}
