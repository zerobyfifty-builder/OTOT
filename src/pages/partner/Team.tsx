import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { roleLabel } from "@/lib/portal";
import { DateTimeCell, EmptyCard, PartnerPageHeader, Spinner, StaticHead } from "@/components/partner/PartnerUI";
import { PAGE_SIZE } from "@/components/partner/partnerTheme";
import { useRefresh } from "@/components/partner/useRefresh";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { AppRole } from "@/types/otot";

const ROLE_COLORS: Partial<Record<AppRole, string>> = {
  partner_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  partner_agent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function PartnerTeam() {
  const { session } = useAuth();
  const { state, loading, refresh } = useStore();
  const { refreshing, run: handleRefresh } = useRefresh(refresh);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const members = state.users.filter((u) => u.vendorId === session?.vendorId);
  const vendor = state.vendors.find((v) => v.id === session?.vendorId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return `${u.name} ${u.email}`.toLowerCase().includes(q);
    });
  }, [members, roleFilter, search]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <PartnerPageHeader
        title="Team"
        subtitle={vendor ? `${vendor.name} · organization members and their roles` : "Organization members and their roles"}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">
            {members.length} {members.length === 1 ? "Member" : "Members"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Vendor admins and field agents with portal access</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="partner_admin">Partner Admin</SelectItem>
            <SelectItem value="partner_agent">Partner Agent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && members.length === 0 ? (
        <Spinner />
      ) : members.length === 0 ? (
        <EmptyCard icon={Users} message="No team members yet." />
      ) : (
        <Card className="overflow-hidden">
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <StaticHead label="Name" />
                  <StaticHead label="Email" />
                  <StaticHead label="Job Role" />
                  <StaticHead label="Joined" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No members match this search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.slice(0, PAGE_SIZE).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {u.name
                                .split(" ")
                                .map((w) => w.charAt(0))
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ROLE_COLORS[u.role]}>
                          {roleLabel(u.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DateTimeCell value={u.createdAt} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
