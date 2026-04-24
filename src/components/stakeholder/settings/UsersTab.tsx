import React, { useState } from "react";
import { useOrgStakeholderType, ROLE_LABELS, getRolesForStakeholderType } from "@/hooks/useOrgStakeholderType";
import { useOrgUsers, useToggleOrgUserStatus, useRemoveOrgUser, OrgUserRow } from "@/hooks/useOrgUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, MoreVertical, Search, Pencil, Shield, Power, Trash2, Mail } from "lucide-react";
import { InviteUserDialog } from "./users/InviteUserDialog";
import { EditUserDialog } from "./users/EditUserDialog";
import { UserPermissionsSheet } from "./users/UserPermissionsSheet";
import { formatDistanceToNow } from "date-fns";

const roleColor: Record<string, string> = {
  org_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  finance: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  project_manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  field_ops: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  expert: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  operations_manager: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  community_coordinator: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  impact_analyst: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  user: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

export const UsersTab: React.FC = () => {
  const { data: orgCtx } = useOrgStakeholderType();
  const { data: members = [], isLoading } = useOrgUsers(orgCtx?.organizationId);
  const toggleStatus = useToggleOrgUserStatus();
  const removeUser = useRemoveOrgUser();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<OrgUserRow | null>(null);
  const [permsUser, setPermsUser] = useState<OrgUserRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrgUserRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ user: OrgUserRow; next: "active" | "deactivated" } | null>(null);

  const filtered = members.filter((m) => {
    const matchesSearch = !search ||
      `${m.first_name || ""} ${m.last_name || ""} ${m.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || m.job_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const initials = (m: OrgUserRow) =>
    `${(m.first_name?.[0] || m.email[0] || "?").toUpperCase()}${(m.last_name?.[0] || "").toUpperCase()}`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">{members.length} {members.length === 1 ? "Member" : "Members"}</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage organization members and their permissions</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="pl-10" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Job Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                No members yet. Click "Add User" to add your first team member.
              </TableCell></TableRow>
            ) : (
              filtered.map((m) => {
                const joinedAt = m.joined_at || m.invited_at || m.created_at;
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials(m)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium leading-tight">
                            {[m.first_name, m.last_name].filter(Boolean).join(" ") || "—"}
                          </p>
                          {m.position && <p className="text-xs text-muted-foreground mt-0.5">{m.position}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{m.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={roleColor[m.job_role] || ""}>
                        {ROLE_LABELS[m.job_role] || m.job_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.status === "active" && (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
                        </span>
                      )}
                      {m.status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="h-2 w-2 rounded-full bg-amber-500" /> Pending
                        </span>
                      )}
                      {m.status === "deactivated" && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Deactivated
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" title={new Date(joinedAt).toLocaleString()}>
                      {formatDistanceToNow(new Date(joinedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditUser(m)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit user</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPermsUser(m)}><Shield className="h-3.5 w-3.5 mr-2" />Manage permissions</DropdownMenuItem>
                          {m.status === "pending" && (
                            <DropdownMenuItem><Mail className="h-3.5 w-3.5 mr-2" />Resend invite</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {m.status !== "deactivated" ? (
                            <DropdownMenuItem onClick={() => setConfirmToggle({ user: m, next: "deactivated" })}>
                              <Power className="h-3.5 w-3.5 mr-2" />Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setConfirmToggle({ user: m, next: "active" })}>
                              <Power className="h-3.5 w-3.5 mr-2" />Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setConfirmDelete(m)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" />Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditUserDialog user={editUser} onOpenChange={(o) => !o && setEditUser(null)} />
      <UserPermissionsSheet user={permsUser} onOpenChange={(o) => !o && setPermsUser(null)} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.email} will lose access to your organization. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) removeUser.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmToggle} onOpenChange={(o) => !o && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.next === "deactivated" ? "Deactivate this user?" : "Activate this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.next === "deactivated"
                ? `${confirmToggle?.user.email} will lose access until reactivated.`
                : `${confirmToggle?.user.email} will regain access to the organization.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmToggle) toggleStatus.mutate({ id: confirmToggle.user.id, next: confirmToggle.next });
                setConfirmToggle(null);
              }}
            >
              {confirmToggle?.next === "deactivated" ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
