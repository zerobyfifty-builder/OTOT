import React, { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrgOwnerType } from "@/hooks/useOrgOwnerType";
import { useOrgCustomRoles } from "@/hooks/useOrgCustomRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

export const InviteUserDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { data: orgCtx } = useOrgOwnerType();
  const qc = useQueryClient();
  const { data: roles = [] } = useOrgCustomRoles(orgCtx?.organizationId, { activeOnly: true });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [position, setPosition] = useState("");
  const [jobRole, setJobRole] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFirstName(""); setLastName(""); setEmail(""); setPassword("");
    setShowPassword(false); setPosition(""); setJobRole(""); setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !jobRole || !orgCtx?.organizationId) {
      toast.error("Email and Role are required");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    const selected = roles.find((r) => r.id === jobRole);
    if (!selected) {
      toast.error("Please select a valid role");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("org-invite-user", {
        body: {
          organization_id: orgCtx.organizationId,
          email: email.trim(),
          password,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          position: position.trim() || null,
          job_role: selected.mapped_job_role,
          custom_role_id: selected.id,
          personal_message: message.trim() || null,
          owner_type: orgCtx.ownerType,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("User created successfully");
      qc.invalidateQueries({ queryKey: ["orgUsers"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add User</SheetTitle>
          <SheetDescription>Create a new user account for your organization.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position / Title</Label>
            <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Forestry Lead" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={jobRole} onValueChange={setJobRole}>
              <SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message</Label>
            <Textarea id="message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional welcome message" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create User"}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
