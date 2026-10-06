import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStore, type StaffRole } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { roleLabel } from "@/lib/portal";
import { TablePagination } from "@/components/admin/TablePagination";
import { usePagination } from "@/components/admin/usePagination";
import {
  AccountStatus,
  CreateStaffDialog,
  StaffAccountActions,
  TemporaryPasswordDialog,
  type IssuedCredentials,
} from "@/components/admin/StaffAccounts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MinistryUsers() {
  const { session } = useAuth();
  const { state, loading, refresh } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(null);

  // Ministry admins manage view-only Ministry users; Super Admin manages both roles.
  const manageable: StaffRole[] =
    session?.role === "super_admin"
      ? ["ministry_user", "ministry_admin"]
      : session?.role === "ministry_admin"
        ? ["ministry_user"]
        : [];
  const canManage = (role: string, userId: string) =>
    userId !== session?.userId && (manageable as string[]).includes(role);

  const users = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return state.users
      .filter((u) => u.role === "ministry_admin" || u.role === "ministry_user")
      .filter((u) => roleFilter === "all" || u.role === roleFilter)
      .filter((u) => !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.users, searchTerm, roleFilter]);

  const pager = usePagination(users, 10);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Ministry Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Admins can assign partners and release payouts; users have view-only access
          </p>
        </div>
        <div className="flex items-center gap-2">
          {manageable.length > 0 && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {manageable.length === 1 ? "Add Ministry user" : "Add Ministry account"}
            </Button>
          )}
          <Button
            onClick={() => refresh().catch((err) => toast.error(apiErrorMessage(err)))}
            variant="outline"
            size="icon"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
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
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ministry_admin">Ministry Admins</SelectItem>
                <SelectItem value="ministry_user">Ministry Users</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pager.pageSize.toString()} onValueChange={(value) => pager.setPageSize(Number(value))}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((size) => (
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
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
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
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      {manageable.length > 0 && (
                        <TableHead className="w-10">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pager.pageRows.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email || "—"}</TableCell>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "ministry_admin" ? "default" : "secondary"}>
                            {roleLabel(u.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AccountStatus user={u} />
                        </TableCell>
                        <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                        {manageable.length > 0 && (
                          <TableCell>
                            {canManage(u.role, u.id) && <StaffAccountActions user={u} onCredentials={setCredentials} />}
                          </TableCell>
                        )}
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

      {manageable.length > 0 && (
        <CreateStaffDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          roles={manageable}
          onCreated={setCredentials}
        />
      )}
      <TemporaryPasswordDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
