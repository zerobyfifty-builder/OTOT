import { useState, type FormEvent } from "react";
import { AlertTriangle, Copy, KeyRound, MoreVertical, Power, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useStore, type StaffRole } from "@/contexts/StoreContext";
import { apiErrorMessage } from "@/lib/api";
import { roleLabel } from "@/lib/portal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppRole, AppUser, Vendor } from "@/types/otot";

const PARTNER_ROLES: AppRole[] = ["partner_admin", "partner_agent"];

/** A temporary password to show once, after creating or resetting an account. */
export interface IssuedCredentials {
  kind: "created" | "reset";
  name: string;
  email: string;
  temporaryPassword: string;
}

/** Active/Inactive plus a "Must set password" flag for accounts on a temporary password. */
export function AccountStatus({ user }: { user: AppUser }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge
        variant="outline"
        className={
          user.active
            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
            : "bg-stone-100 text-stone-600 border-stone-200"
        }
      >
        {user.active ? "Active" : "Inactive"}
      </Badge>
      {user.mustChangePassword && (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap">
          Must set password
        </Badge>
      )}
    </div>
  );
}

/** Shows a temporary password once, with a copy button and a clear warning. */
export function TemporaryPasswordDialog({
  credentials,
  onClose,
}: {
  credentials: IssuedCredentials | null;
  onClose: () => void;
}) {
  const copy = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(credentials.temporaryPassword);
      toast.success("Temporary password copied");
    } catch {
      toast.error("Couldn't copy automatically. Select the password and copy it by hand.");
    }
  };

  return (
    <Dialog open={credentials !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {credentials?.kind === "reset" ? "Password reset" : "Account created"}
          </DialogTitle>
          <DialogDescription>
            Give this temporary password to {credentials?.name} privately. They must choose their own password the
            first time they sign in.
          </DialogDescription>
        </DialogHeader>
        {credentials && (
          <div className="space-y-4">
            <div className="space-y-1 text-sm">
              <div className="text-muted-foreground">Sign-in email</div>
              <div className="font-medium break-all">{credentials.email || "—"}</div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="temporary-password">Temporary password</Label>
              <div className="flex gap-2">
                <Input
                  id="temporary-password"
                  readOnly
                  value={credentials.temporaryPassword}
                  className="font-mono"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button type="button" variant="outline" onClick={() => void copy()}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
            <p className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              This password won't be shown again. Copy it now; if it's lost, reset the password again.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>I've saved it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Create a staff account. `roles` limits what this user may create (the API
 * enforces the same rule). Partner roles need a partner unless
 * `fixedVendorId` is set (a partner admin adding to their own team).
 */
export function CreateStaffDialog({
  open,
  onOpenChange,
  roles,
  vendors = [],
  fixedVendorId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: StaffRole[];
  vendors?: Vendor[];
  fixedVendorId?: string;
  onCreated: (credentials: IssuedCredentials) => void;
}) {
  const { createStaffUser } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>(roles[0]);
  const [vendorId, setVendorId] = useState("");
  const [saving, setSaving] = useState(false);
  const activeVendors = vendors.filter((v) => v.status === "active");
  const needsVendor = PARTNER_ROLES.includes(role) && !fixedVendorId;

  const reset = () => {
    setName("");
    setEmail("");
    setRole(roles[0]);
    setVendorId("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (needsVendor && !vendorId) {
      toast.error("Choose the partner organisation this account belongs to.");
      return;
    }
    setSaving(true);
    try {
      const result = await createStaffUser({
        name: name.trim(),
        email: email.trim(),
        role,
        vendorId: PARTNER_ROLES.includes(role) ? (fixedVendorId ?? vendorId) : undefined,
      });
      onCreated({
        kind: "created",
        name: result.user.name,
        email: result.user.email,
        temporaryPassword: result.temporaryPassword,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {roles.length === 1 ? `Add ${roleLabel(roles[0])}` : "Add staff account"}
          </DialogTitle>
          <DialogDescription>
            You'll get a one-time temporary password to give them. They choose their own password at first sign-in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-name">Full name</Label>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              required
            />
          </div>
          {roles.length > 1 && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as StaffRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {needsVendor && (
            <div className="space-y-2">
              <Label>Partner organisation</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder={activeVendors.length ? "Select partner" : "No active partners"} />
                </SelectTrigger>
                <SelectContent>
                  {activeVendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Only active partners can have new accounts.</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || (needsVendor && !vendorId)}>
              {saving ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Deactivate / reactivate / reset password, each behind a confirmation. */
export function StaffAccountActions({
  user,
  onCredentials,
}: {
  user: AppUser;
  onCredentials: (credentials: IssuedCredentials) => void;
}) {
  const { setUserActive, resetUserPassword } = useStore();
  const [confirm, setConfirm] = useState<"status" | "reset" | null>(null);
  const label = user.name || user.email || "this account";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${label}`}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!user.active} onClick={() => setConfirm("reset")}>
            <KeyRound className="h-4 w-4 mr-2" />
            Reset password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirm("status")}>
            <Power className="h-4 w-4 mr-2" />
            {user.active ? "Deactivate" : "Reactivate"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm === "status"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={user.active ? `Deactivate ${label}?` : `Reactivate ${label}?`}
        description={
          user.active ? (
            <>
              <p>They are signed out everywhere and can't sign in until you reactivate them. Their past work stays on record.</p>
              {user.role === "partner_agent" && (
                <p>Tickets assigned to them stay assigned. Move open tickets to another agent on Tree Orders.</p>
              )}
            </>
          ) : (
            <p>They can sign in again with their existing password.</p>
          )
        }
        confirmLabel={user.active ? "Deactivate" : "Reactivate"}
        destructive={user.active}
        onConfirm={async () => {
          await setUserActive(user.id, !user.active);
          toast.success(`${label} ${user.active ? "deactivated" : "reactivated"}`);
        }}
      />

      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Reset ${label}'s password?`}
        description={
          <p>
            Their current password stops working and they are signed out. You'll get a one-time temporary password to
            give them, and they must choose a new password when they sign in.
          </p>
        }
        confirmLabel="Reset password"
        destructive
        onConfirm={async () => {
          const result = await resetUserPassword(user.id);
          onCredentials({
            kind: "reset",
            name: result.user.name,
            email: result.user.email,
            temporaryPassword: result.temporaryPassword,
          });
        }}
      />
    </>
  );
}
