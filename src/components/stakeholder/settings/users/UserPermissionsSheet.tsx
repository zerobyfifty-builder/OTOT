import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { OrgUserRow } from "@/hooks/useOrgUsers";
import { useOrgStakeholderType, ROLE_LABELS } from "@/hooks/useOrgStakeholderType";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props { user: OrgUserRow | null; onOpenChange: (o: boolean) => void; }

interface ModuleRow { id: string; name: string; display_name: string; }
interface PermRow {
  module_name: string;
  enabled: boolean;
  permissions: { read: boolean; write: boolean; edit: boolean; delete: boolean };
  sub_features: Record<string, boolean>;
}

// All 7 action-menu items shown on the Tree Orders page row.
// Checking an item grants the user access to ONLY that action.
const TREE_ORDERS_SUBFEATURES: Array<{ key: string; label: string }> = [
  { key: "tree_orders.action.planting_status", label: "Planting Status (Enable Status change)" },
  { key: "tree_orders.action.per_tree_status", label: "Per-Tree Status (Access to view individual trees)" },
  { key: "tree_orders.action.tree_operations", label: "Tree Operations" },
  { key: "tree_orders.action.planting_overview", label: "Planting Overview" },
  { key: "tree_orders.action.monitoring_logs", label: "Monitoring Logs" },
  { key: "tree_orders.action.ecosystem_impact", label: "Ecosystem Impact" },
  { key: "tree_orders.action.community_impact", label: "Community Impact" },
  { key: "tree_orders.action.carbon_metrics", label: "Carbon Metrics" },
  { key: "tree_orders.action.engagement", label: "Engagement" },
];

// Sidebar display order for modules in the Manage Permissions sheet.
// Modules not listed are appended at the end.
const MODULE_DISPLAY_ORDER: string[] = [
  "dashboard",
  "financial_management",
  "trip_management",
  "tree_orders",
  "tree_management",
  "community_impact",
  "outcomes",
  "impact_insights",
  "travel_agents",
  "analytics",
  "mdm_locations",
  "mdm_nurseries",
  "mdm_species",
  "mdm_planters",
  "mdm_sequestration",
];

// Override module display names to match the sidebar labels.
const MODULE_DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  tree_management: "Tree Insights",
};

export const UserPermissionsSheet: React.FC<Props> = ({ user, onOpenChange }) => {
  const { data: orgCtx } = useOrgStakeholderType();
  const qc = useQueryClient();
  const [perms, setPerms] = useState<Record<string, PermRow>>({});
  const [saving, setSaving] = useState(false);

  // Load assigned org modules
  const { data: orgModules = [] } = useQuery({
    queryKey: ["orgAssignedModulesForPerms", orgCtx?.organizationId],
    queryFn: async (): Promise<ModuleRow[]> => {
      if (!orgCtx?.organizationId) return [];
      const { data } = await supabase
        .from("organization_modules")
        .select("modules(id, name, display_name)")
        .eq("organization_id", orgCtx.organizationId)
        .eq("is_active", true);
      return ((data || []).map((r: any) => r.modules).filter(Boolean)) as ModuleRow[];
    },
    enabled: !!orgCtx?.organizationId,
  });

  // Load existing user perms
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("org_user_permissions")
        .select("module_name, enabled, permissions, sub_features")
        .eq("org_user_id", user.id);
      const map: Record<string, PermRow> = {};
      (data || []).forEach((r: any) => { map[r.module_name] = r as PermRow; });
      setPerms(map);
    })();
  }, [user]);

  const togglePerm = (moduleName: string, key: keyof PermRow["permissions"], value: boolean) => {
    setPerms((p) => ({
      ...p,
      [moduleName]: {
        module_name: moduleName,
        enabled: p[moduleName]?.enabled ?? true,
        permissions: { ...(p[moduleName]?.permissions || { read: true, write: false, edit: false, delete: false }), [key]: value },
        sub_features: p[moduleName]?.sub_features || {},
      },
    }));
  };

  const setEnabled = (moduleName: string, enabled: boolean) => {
    setPerms((p) => ({
      ...p,
      [moduleName]: {
        module_name: moduleName,
        enabled,
        permissions: p[moduleName]?.permissions || { read: true, write: false, edit: false, delete: false },
        sub_features: p[moduleName]?.sub_features || {},
      },
    }));
  };

  const setSub = (moduleName: string, key: string, value: boolean) => {
    setPerms((p) => ({
      ...p,
      [moduleName]: {
        module_name: moduleName,
        enabled: p[moduleName]?.enabled ?? true,
        permissions: p[moduleName]?.permissions || { read: true, write: false, edit: false, delete: false },
        sub_features: { ...(p[moduleName]?.sub_features || {}), [key]: value },
      },
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Delete existing then re-insert (simpler than upsert per row)
      await supabase.from("org_user_permissions").delete().eq("org_user_id", user.id);
      const rows = Object.values(perms).map((p) => ({
        org_user_id: user.id,
        module_name: p.module_name,
        enabled: p.enabled,
        permissions: p.permissions as any,
        sub_features: p.sub_features as any,
      }));
      if (rows.length) {
        const { error } = await supabase.from("org_user_permissions").insert(rows);
        if (error) throw error;
      }
      toast.success("Permissions saved");
      qc.invalidateQueries({ queryKey: ["modulePermissions"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Permissions</SheetTitle>
          <SheetDescription>
            {user.email} <Badge variant="secondary" className="ml-2">{ROLE_LABELS[user.job_role]}</Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {orgModules.length === 0 && (
            <p className="text-sm text-muted-foreground">No modules assigned to this organization yet.</p>
          )}
          {[...orgModules]
            .sort((a, b) => {
              const ai = MODULE_DISPLAY_ORDER.indexOf(a.name);
              const bi = MODULE_DISPLAY_ORDER.indexOf(b.name);
              return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            })
            .map((mod) => {
            const p = perms[mod.name] || { module_name: mod.name, enabled: false, permissions: { read: true, write: false, edit: false, delete: false }, sub_features: {} };
            const showSubs = mod.name === "tree_orders";
            const displayName = MODULE_DISPLAY_NAME_OVERRIDES[mod.name] || mod.display_name;
            return (
              <div key={mod.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{mod.name}</p>
                  </div>
                  <Switch checked={p.enabled} onCheckedChange={(v) => setEnabled(mod.name, v)} />
                </div>
                {p.enabled && (
                  <>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      {(["read", "write", "edit", "delete"] as const).map((k) => (
                        <label key={k} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={p.permissions[k]} onCheckedChange={(v) => togglePerm(mod.name, k, !!v)} />
                          <span className="capitalize">{k}</span>
                        </label>
                      ))}
                    </div>
                    {showSubs && (
                      <div className="ml-2 pl-3 border-l space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sub-features</p>
                        {TREE_ORDERS_SUBFEATURES.map((sf) => (
                          <label key={sf.key} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={!!p.sub_features[sf.key]} onCheckedChange={(v) => setSub(mod.name, sf.key, !!v)} />
                            <span>{sf.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <Separator />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-6">
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Permissions"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
