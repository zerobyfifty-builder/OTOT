import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgStakeholderType } from "@/hooks/useOrgStakeholderType";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

export const OrganizationTab: React.FC = () => {
  const { data: orgCtx } = useOrgStakeholderType();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgCtx?.organizationId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("organizations")
        .select("name, contact_email, contact_phone, contact_person, website, category, is_active")
        .eq("id", orgCtx.organizationId)
        .maybeSingle();
      setOrg(data);
      setLoading(false);
    })();
  }, [orgCtx?.organizationId]);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!org) return <p className="text-muted-foreground text-sm">No organization data available.</p>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
          <div>
            <CardTitle className="text-lg">Organization</CardTitle>
            <CardDescription>Your organization details (managed by admin)</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label className="text-muted-foreground text-xs">Organization Name</Label><p className="font-medium">{org.name}</p></div>
          <div><Label className="text-muted-foreground text-xs">Category</Label><p className="font-medium capitalize">{org.category}</p></div>
          <div><Label className="text-muted-foreground text-xs">Contact Person</Label><p className="font-medium">{org.contact_person || "—"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Contact Email</Label><p className="font-medium">{org.contact_email || "—"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Contact Phone</Label><p className="font-medium">{org.contact_phone || "—"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Website</Label><p className="font-medium">{org.website || "—"}</p></div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Label className="text-muted-foreground text-xs">Status</Label>
          <Badge variant={org.is_active ? "default" : "secondary"}>{org.is_active ? "Active" : "Inactive"}</Badge>
        </div>
      </CardContent>
    </Card>
  );
};
