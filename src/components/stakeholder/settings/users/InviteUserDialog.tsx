import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrgStakeholderType, getRolesForStakeholderType } from "@/hooks/useOrgStakeholderType";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

export const InviteUserDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { data: orgCtx } = useOrgStakeholderType();
  const qc = useQueryClient();
  const roles = getRolesForStakeholderType(orgCtx?.stakeholderType || "other");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("");
  const [jobRole, setJobRole] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFirstName(""); setLastName(""); setEmail(""); setPosition(""); setJobRole(""); setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !jobRole || !orgCtx?.organizationId) {
      toast.error("Email and Job Role are required");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("org-invite-user", {
        body: {
          organization_id: orgCtx.organizationId,
          email: email.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          position: position.trim() || null,
          job_role: jobRole,
          personal_message: message.trim() || null,
          stakeholder_type: orgCtx.stakeholderType,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Invitation sent");
      qc.invalidateQueries({ queryKey: ["orgUsers"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>Send an invitation to join your organization.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="position">Position / Title</Label>
            <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Forestry Lead" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Job Role *</Label>
            <Select value={jobRole} onValueChange={setJobRole}>
              <SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (<SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message</Label>
            <Textarea id="message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional welcome message included in the invite email" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send Invitation"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
