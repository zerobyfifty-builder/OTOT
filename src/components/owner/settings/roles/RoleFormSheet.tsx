import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  OrgCustomRole, ROLE_COLOR_PRESETS, ROLE_COLOR_CLASSES,
  useCreateOrgCustomRole, useUpdateOrgCustomRole,
} from "@/hooks/useOrgCustomRoles";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  organizationId: string | null | undefined;
  role?: OrgCustomRole | null;
}

export const RoleFormSheet: React.FC<Props> = ({ open, onOpenChange, organizationId, role }) => {
  const isEdit = !!role;
  const create = useCreateOrgCustomRole();
  const update = useUpdateOrgCustomRole();

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("emerald");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "");
      setColor(role?.color ?? "emerald");
      setDescription(role?.description ?? "");
    }
  }, [open, role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !organizationId) return;
    if (isEdit && role) {
      await update.mutateAsync({ id: role.id, patch: { name: name.trim(), color, description: description.trim() || null } });
    } else {
      await create.mutateAsync({ organization_id: organizationId, name: name.trim(), color, description: description.trim() || null });
    }
    onOpenChange(false);
  };

  const submitting = create.isPending || update.isPending;
  const nameLocked = isEdit && role?.is_system;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Role" : "Create Role"}</SheetTitle>
          <SheetDescription>Define a custom role for your unit.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label htmlFor="role-name">Role Name *</Label>
            <Input id="role-name" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Community Coordinator" disabled={!!nameLocked} />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {ROLE_COLOR_PRESETS.map((c) => {
                const cls = ROLE_COLOR_CLASSES[c];
                const selected = color === c;
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "rounded-md px-3 py-2 text-xs font-medium capitalize transition",
                      cls.pill,
                      selected ? `ring-2 ring-offset-2 ring-offset-background ${cls.ring}` : "ring-0"
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-desc">Description</Label>
            <Textarea id="role-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save" : "Create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
