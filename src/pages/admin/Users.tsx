import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { roleLabel } from "@/lib/portal";
import { shortDate } from "@/lib/format";
import { PortalPage, TableFrame } from "@/components/portal/PortalUI";
import { Badge } from "@/components/ui/badge";
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

function roleVariant(role: AppRole): "default" | "secondary" | "outline" | "destructive" {
  if (role === "super_admin") return "destructive";
  if (role === "tourist") return "secondary";
  return "default";
}

export default function AdminUsers() {
  const { state } = useStore();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const users = useMemo(() => {
    const roles = ROLE_FILTERS.find((f) => f.value === roleFilter)?.roles;
    const q = search.trim().toLowerCase();
    return state.users.filter(
      (u) =>
        (!roles || roles.includes(u.role)) &&
        (!q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)),
    );
  }, [state.users, search, roleFilter]);

  return (
    <PortalPage tone="admin" title="All Users" subtitle="Tourist, ministry, and plantation partner accounts.">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
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
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users found.</div>
          ) : (
            <TableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleVariant(u.role)}>{roleLabel(u.role)}</Badge>
                      </TableCell>
                      <TableCell>{u.createdAt ? shortDate(u.createdAt) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableFrame>
          )}
        </CardContent>
      </Card>
    </PortalPage>
  );
}
