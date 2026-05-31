import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useOrgOwnerType } from "@/hooks/useOrgOwnerType";
import {
  OrgCustomRole, ROLE_COLOR_CLASSES,
  useOrgCustomRoles, useUpdateOrgCustomRole, useDeleteOrgCustomRole,
} from "@/hooks/useOrgCustomRoles";
import { RoleFormSheet } from "./roles/RoleFormSheet";

export const RolesTab: React.FC = () => {
  const { data: orgCtx } = useOrgOwnerType();
  const orgId = orgCtx?.organizationId;
  const { data: roles = [], isLoading } = useOrgCustomRoles(orgId);
  const update = useUpdateOrgCustomRole();
  const remove = useDeleteOrgCustomRole();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editRole, setEditRole] = useState<OrgCustomRole | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrgCustomRole | null>(null);

  const openCreate = () => { setEditRole(null); setSheetOpen(true); };
  const openEdit = (r: OrgCustomRole) => { setEditRole(r); setSheetOpen(true); };

  const fmtDate = (s: string) => {
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Roles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define custom roles for users in {orgCtx?.organizationName || "your organization"}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Create Role
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Active</TableHead>
              <TableHead className="w-40">Created</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : roles.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                No roles yet. Click "Create Role" to add your first one.
              </TableCell></TableRow>
            ) : (
              roles.map((r) => {
                const cls = ROLE_COLOR_CLASSES[r.color] || ROLE_COLOR_CLASSES.slate;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="secondary" className={cls.pill}>{r.name}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.description || "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={r.is_active}
                        disabled={r.is_system || update.isPending}
                        onCheckedChange={(v) => update.mutate({ id: r.id, patch: { is_active: v } })}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">{fmtDate(r.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          {!r.is_system && (
                            <DropdownMenuItem
                              onClick={() => setConfirmDelete(r)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
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

      <RoleFormSheet open={sheetOpen} onOpenChange={setSheetOpen} organizationId={orgId} role={editRole} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" will be removed. Users currently assigned this role will keep their record but will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDelete) remove.mutate(confirmDelete.id); setConfirmDelete(null); }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RolesTab;
