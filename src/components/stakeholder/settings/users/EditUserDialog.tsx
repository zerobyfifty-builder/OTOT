import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrgStakeholderType, getRolesForStakeholderType } from "@/hooks/useOrgStakeholderType";
import { OrgUserRow, useUpdateOrgUser } from "@/hooks/useOrgUsers";

interface Props { user: OrgUserRow | null; onOpenChange: (o: boolean) => void; }

export const EditUserDialog: React.FC<Props> = ({ user, onOpenChange }) => {
  const { data: orgCtx } = useOrgStakeholderType();
  const roles = getRolesForStakeholderType(orgCtx?.stakeholderType || "other");
  const update = useUpdateOrgUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [jobRole, setJobRole] = useState<string>("");

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPosition(user.position || "");
      setJobRole(user.job_role);
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync({
      id: user.id,
      patch: { first_name: firstName || null, last_name: lastName || null, position: position || null, job_role: jobRole },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Position / Title</Label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Job Role</Label>
            <Select value={jobRole} onValueChange={setJobRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (<SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
