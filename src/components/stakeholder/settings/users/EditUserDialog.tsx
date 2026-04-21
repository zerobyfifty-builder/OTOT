import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useOrgStakeholderType, getRolesForStakeholderType } from "@/hooks/useOrgStakeholderType";
import { OrgUserRow, useUpdateOrgUser } from "@/hooks/useOrgUsers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

interface Props { user: OrgUserRow | null; onOpenChange: (o: boolean) => void; }

export const EditUserDialog: React.FC<Props> = ({ user, onOpenChange }) => {
  const { data: orgCtx } = useOrgStakeholderType();
  const roles = getRolesForStakeholderType(orgCtx?.stakeholderType || "other");
  const update = useUpdateOrgUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [jobRole, setJobRole] = useState<string>("");
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPosition(user.position || "");
      setJobRole(user.job_role);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await update.mutateAsync({
      id: user.id,
      patch: { first_name: firstName || null, last_name: lastName || null, position: position || null, job_role: jobRole },
    });
    onOpenChange(false);
  };

  const handleSendReset = async () => {
    if (!user) return;
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset link sent to ${user.email}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send password reset email");
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription>Update user details and job role.</SheetDescription>
        </SheetHeader>
        {user && (
          <form onSubmit={handleSave} className="space-y-4 mt-6">
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

            <Separator className="my-2" />

            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Send a password reset email so the user can set a new password.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleSendReset}
                disabled={sendingReset}
              >
                <KeyRound className="h-3.5 w-3.5" />
                {sendingReset ? "Sending..." : "Send password reset email"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};
