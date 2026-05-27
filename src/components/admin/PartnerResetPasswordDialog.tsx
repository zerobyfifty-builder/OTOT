import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  contact_email: string;
}

interface PartnerResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: Partner;
}

export function PartnerResetPasswordDialog({
  open,
  onOpenChange,
  partner,
}: PartnerResetPasswordDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Get the user_id from users table using organization_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_id")
        .eq("organization_id", partner.id)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData?.user_id) throw new Error("No user account found for this partner");

      const { error } = await supabase.functions.invoke("admin-set-user-password", {
        body: { userId: userData.user_id, newPassword },
      });

      if (error) throw error;

      toast.success(`Password reset for ${partner.name}`);
      setNewPassword("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for <strong>{partner.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={partner.contact_email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New Password *</Label>
            <Input
              id="password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 6 characters
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewPassword("");
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
