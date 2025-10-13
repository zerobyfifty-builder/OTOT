import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  legal_name: string;
  category: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  verified: boolean;
  has_api_access: boolean;
  contact_person?: string;
  website?: string;
  address?: any;
}

interface PartnerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: Partner;
  onUpdate: () => void;
}

export function PartnerEditDialog({
  open,
  onOpenChange,
  partner,
  onUpdate,
}: PartnerEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: partner.name,
    legal_name: partner.legal_name,
    contact_person: partner.contact_person || "",
    contact_email: partner.contact_email,
    contact_phone: partner.contact_phone,
    website: partner.website || "",
    verified: partner.verified,
    has_api_access: partner.has_api_access,
  });

  useEffect(() => {
    setFormData({
      name: partner.name,
      legal_name: partner.legal_name,
      contact_person: partner.contact_person || "",
      contact_email: partner.contact_email,
      contact_phone: partner.contact_phone,
      website: partner.website || "",
      verified: partner.verified,
      has_api_access: partner.has_api_access,
    });
  }, [partner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: formData.name,
          legal_name: formData.legal_name,
          contact_person: formData.contact_person,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          website: formData.website,
          verified: formData.verified,
          has_api_access: formData.has_api_access,
        })
        .eq("id", partner.id);

      if (error) throw error;

      toast.success("Partner updated successfully");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating partner:", error);
      toast.error("Failed to update partner");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Partner</DialogTitle>
          <DialogDescription>
            Update partner information and settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legal_name">Legal Name</Label>
            <Input
              id="legal_name"
              value={formData.legal_name}
              onChange={(e) =>
                setFormData({ ...formData, legal_name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input
              id="contact_person"
              value={formData.contact_person}
              onChange={(e) =>
                setFormData({ ...formData, contact_person: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email *</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) =>
                setFormData({ ...formData, contact_email: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <Input
              id="contact_phone"
              value={formData.contact_phone}
              onChange={(e) =>
                setFormData({ ...formData, contact_phone: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Verified</Label>
              <p className="text-sm text-muted-foreground">
                Mark this partner as verified
              </p>
            </div>
            <Switch
              checked={formData.verified}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, verified: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>API Access</Label>
              <p className="text-sm text-muted-foreground">
                Enable API access for this partner
              </p>
            </div>
            <Switch
              checked={formData.has_api_access}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, has_api_access: checked })
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
