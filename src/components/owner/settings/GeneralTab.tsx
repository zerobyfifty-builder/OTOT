import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Lock, Phone, Shield, Building2 } from "lucide-react";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useOrgOwnerType } from "@/hooks/useOrgOwnerType";

interface UserDetails {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
}

export const GeneralTab: React.FC = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLogger();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("users")
        .select("first_name, last_name, email, phone_number")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setUserDetails(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setPhoneNumber(data.phone_number || "");
        setNewEmail(data.email);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone_number: phoneNumber.trim() || null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile updated successfully");
      logActivity({
        action_type: "profile_update",
        resource_type: "user",
        resource_id: user.id,
        description: "Updated personal profile (name / phone)",
        metadata: { first_name: firstName, last_name: lastName, phone_number: phoneNumber },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user || !newEmail.trim()) return;
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success("Verification email sent to new address.");
      logActivity({
        action_type: "email_change_requested",
        resource_type: "user",
        resource_id: user.id,
        description: `Requested email change to ${newEmail.trim()}`,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to update email");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) return toast.error("Fill both password fields");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      logActivity({
        action_type: "password_change",
        resource_type: "user",
        resource_id: user.id,
        description: "Changed account password",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><User className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="pl-10" placeholder="+254..." />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleUpdateProfile} disabled={profileLoading}>{profileLoading ? "Saving..." : "Save Changes"}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle className="text-lg">Email Address</CardTitle>
              <CardDescription>Update your login email address</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <p className="text-xs text-muted-foreground">A verification email will be sent to the new address.</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleUpdateEmail} disabled={emailLoading || newEmail === userDetails?.email}>
              {emailLoading ? "Sending..." : "Update Email"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Lock className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle className="text-lg">Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={passwordLoading}>{passwordLoading ? "Updating..." : "Change Password"}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription>Account security information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">Account ID</p>
            <p className="text-xs text-muted-foreground font-mono">{user?.id || "—"}</p>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">Last Sign In</p>
            <p className="text-xs text-muted-foreground">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}</p>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium">Auth Provider</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.app_metadata?.provider || "email"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
