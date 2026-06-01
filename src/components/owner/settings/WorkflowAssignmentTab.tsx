import { Fragment, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Settings2, Globe, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useOrgOwnerType } from "@/hooks/useOrgOwnerType";
import { useOrgCustomRoles, ROLE_COLOR_CLASSES } from "@/hooks/useOrgCustomRoles";
import { useOrgRolePermissions, useSetRolePermission } from "@/hooks/useOrgRolePermissions";

const PERMISSIONS = ["read", "write", "edit", "delete"] as const;
const PERMISSION_LABELS: Record<string, string> = { read: "Read", write: "Write", edit: "Edit", delete: "Delete" };
const PERMISSION_SHORT: Record<string, string> = { read: "R", write: "W", edit: "E", delete: "D" };

const MODULE_DISPLAY_OVERRIDES: Record<string, string> = {
  "Financial Management": "Climate Funding",
  "Financial": "Climate Funding",
  "Tree Management": "Per-Tree Insights",
  "Trip Management": "Travel Offsets",
  "Impact Journeys": "Travel Offsets",
  "Outcomes": "Environmental Impact",
};

const HIDDEN_MODULE_NAMES = ["planting", "monitoring", "nurseries", "payment_management", "audit_logs", "api_management", "user_management", "org_users"];
const FOREST_REGISTRY_MODULES = ["mdm_locations", "mdm_nurseries", "mdm_species", "mdm_planters", "mdm_sequestration"];

const MODULE_PRIORITY: Record<string, number> = {
  "Dashboard": 0,
  "Climate Funding": 1, "Financial Management": 1, "Financial": 1,
  "Tree Orders": 2,
  "Per-Tree Insights": 3, "Tree Management": 3,
  "Travel Offsets": 4, "Trip Management": 4, "Impact Journeys": 4,
  "Impact Overview": 5, "Impact Insights": 5,
  "Forest Registry": 6,
};

const MODULE_CODES: Record<string, string> = {
  "Dashboard": "OM01",
  "Climate Funding": "OM02", "Financial Management": "OM02", "Financial": "OM02",
  "Tree Orders": "OM03",
  "Per-Tree Insights": "OM04", "Tree Management": "OM04",
  "Travel Offsets": "OM05", "Trip Management": "OM05", "Impact Journeys": "OM05",
  "Impact Overview": "OM06", "Impact Insights": "OM06",
  "Forest Registry": "OM07",
};

const FOREST_SUB_CODES: Record<string, string> = {
  mdm_locations: "OM07A", mdm_nurseries: "OM07B", mdm_species: "OM07C",
  mdm_planters: "OM07D", mdm_sequestration: "OM07E",
};
const FOREST_SUB_ORDER = ["mdm_locations", "mdm_nurseries", "mdm_species", "mdm_planters", "mdm_sequestration"];

const TREE_ORDERS_SUBFEATURES: Array<{ key: string; label: string }> = [
  { key: "tree_orders.action.planting_status", label: "Planting Status" },
  { key: "tree_orders.action.per_tree_status", label: "Per-Tree Status" },
  { key: "tree_orders.action.tree_operations", label: "Tree Operations" },
  { key: "tree_orders.action.planting_overview", label: "Planting Overview" },
  { key: "tree_orders.action.monitoring_logs", label: "Monitoring Logs" },
  { key: "tree_orders.action.ecosystem_impact", label: "Ecosystem Impact" },
  { key: "tree_orders.action.community_impact", label: "Community Impact" },
  { key: "tree_orders.action.carbon_metrics", label: "Carbon Metrics" },
  { key: "tree_orders.action.engagement", label: "Engagement" },
];

const getModuleDisplayName = (m: any) => MODULE_DISPLAY_OVERRIDES[m.display_name] || m.display_name;
const getModuleCode = (m: any) => FOREST_SUB_CODES[m.name] || MODULE_CODES[getModuleDisplayName(m)];
const getModulePriority = (displayName: string) => MODULE_PRIORITY[displayName] ?? 999;

export default function WorkflowAssignmentTab() {
  const { data: orgCtx } = useOrgOwnerType();
  const orgId = orgCtx?.organizationId;
  const { data: customRoles = [], isLoading: loadingRoles } = useOrgCustomRoles(orgId, { activeOnly: true });
  const { data: rolePerms = [], isLoading: loadingPerms } = useOrgRolePermissions(orgId);
  const setPerm = useSetRolePermission();
  const [forestExpanded, setForestExpanded] = useState(true);
  const [treeOrdersExpanded, setTreeOrdersExpanded] = useState(false);

  // Modules assigned to this org (rows)
  const { data: assignedModules = [], isLoading: loadingModules } = useQuery({
    queryKey: ["orgAssignedModulesForWorkflow", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("organization_modules")
        .select("modules(id, name, display_name, access_type, category, sort_order)")
        .eq("organization_id", orgId)
        .eq("is_active", true);
      return ((data || []).map((r: any) => r.modules).filter(Boolean)) as any[];
    },
    enabled: !!orgId,
  });

  // Roles sorted: system Admin first
  const roles = useMemo(() => {
    return [...customRoles].sort((a, b) => {
      if (a.is_system && !b.is_system) return -1;
      if (!a.is_system && b.is_system) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [customRoles]);

  const permKey = (roleId: string, moduleName: string) => `${roleId}:${moduleName}`;
  const permMap = useMemo(() => {
    const m = new Map<string, typeof rolePerms[number]>();
    rolePerms.forEach((p) => m.set(permKey(p.role_id, p.module_name), p));
    return m;
  }, [rolePerms]);

  const isAdminRole = (r: any) => r.is_system && r.mapped_job_role === "org_admin";

  const getRow = (roleId: string, moduleName: string) => permMap.get(permKey(roleId, moduleName));

  const toggleEnabled = (role: any, moduleName: string, accessType: string) => {
    if (isAdminRole(role)) return;
    const existing = getRow(role.id, moduleName);
    const enabled = !(existing?.enabled);
    const defaultPerms = accessType === "scoped"
      ? { read: true, write: true, edit: true, delete: true }
      : { read: true, write: false, edit: false, delete: false };
    setPerm.mutate({
      organization_id: orgId!,
      role_id: role.id,
      module_name: moduleName,
      enabled,
      permissions: existing?.permissions ?? defaultPerms,
      sub_features: existing?.sub_features ?? {},
    });
  };

  const togglePermFlag = (role: any, moduleName: string, perm: keyof OrgPermFlags) => {
    if (isAdminRole(role)) return;
    const existing = getRow(role.id, moduleName);
    const current = existing?.permissions ?? { read: true, write: false, edit: false, delete: false };
    const next: any = { ...current, [perm]: !current[perm] };
    if (perm !== "read" && next[perm] && !next.read) next.read = true;
    setPerm.mutate({
      organization_id: orgId!,
      role_id: role.id,
      module_name: moduleName,
      enabled: existing?.enabled ?? true,
      permissions: next,
      sub_features: existing?.sub_features ?? {},
    });
  };

  const toggleSubFeature = (role: any, moduleName: string, key: string) => {
    if (isAdminRole(role)) return;
    const existing = getRow(role.id, moduleName);
    const cur = existing?.sub_features ?? {};
    const next = { ...cur, [key]: !cur[key] };
    setPerm.mutate({
      organization_id: orgId!,
      role_id: role.id,
      module_name: moduleName,
      enabled: existing?.enabled ?? true,
      permissions: existing?.permissions ?? { read: true, write: false, edit: false, delete: false },
      sub_features: next,
    });
  };

  const isLoading = loadingRoles || loadingPerms || loadingModules;

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (roles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No active roles. Create roles in the Roles tab to allocate workflow access.
        </CardContent>
      </Card>
    );
  }

  if (assignedModules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No modules assigned to this organization yet.
        </CardContent>
      </Card>
    );
  }

  const visibleModules = assignedModules.filter((m: any) => !HIDDEN_MODULE_NAMES.includes(m.name));
  const forestModules = visibleModules
    .filter((m: any) => FOREST_REGISTRY_MODULES.includes(m.name))
    .sort((a: any, b: any) => FOREST_SUB_ORDER.indexOf(a.name) - FOREST_SUB_ORDER.indexOf(b.name));
  const otherModules = visibleModules.filter((m: any) => !FOREST_REGISTRY_MODULES.includes(m.name));

  const rows = [
    ...otherModules.map((module: any) => ({ type: "module" as const, module })),
    ...(forestModules.length > 0 ? [{ type: "forest" as const }] : []),
  ].sort((a, b) => {
    const pA = a.type === "forest" ? getModulePriority("Forest Registry") : getModulePriority(getModuleDisplayName(a.module));
    const pB = b.type === "forest" ? getModulePriority("Forest Registry") : getModulePriority(getModuleDisplayName(b.module));
    if (pA !== pB) return pA - pB;
    if (a.type === "forest" || b.type === "forest") return a.type === "forest" ? -1 : 1;
    return ((a.module.sort_order || 0) - (b.module.sort_order || 0));
  });

  const renderCell = (role: any, m: any) => {
    const accessType = m.access_type || "shared";
    const row = getRow(role.id, m.name);
    const admin = isAdminRole(role);
    const enabled = admin ? true : !!row?.enabled;
    const perms = admin
      ? { read: true, write: true, edit: true, delete: true }
      : (row?.permissions ?? { read: true, write: false, edit: false, delete: false });
    const permList = PERMISSIONS.filter((p) => (perms as any)[p]);

    return (
      <TableCell key={role.id} className="text-center">
        <div className="flex flex-col items-center gap-1.5">
          <Switch checked={enabled} onCheckedChange={() => toggleEnabled(role, m.name, accessType)} disabled={admin} />
          {enabled && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-muted-foreground">
                {permList.map((p) => PERMISSION_SHORT[p]).join("")}
              </span>
              {!admin && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Settings2 className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-3" align="center">
                    <p className="text-xs font-medium mb-2">Permissions</p>
                    <div className="space-y-2">
                      {PERMISSIONS.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={!!(perms as any)[perm]}
                            onCheckedChange={() => togglePermFlag(role, m.name, perm as any)}
                            disabled={perm === "read" && permList.length > 1}
                          />
                          {PERMISSION_LABELS[perm]}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </div>
      </TableCell>
    );
  };

  const renderModuleRow = (m: any, indent = false) => {
    const accessType = m.access_type || "shared";
    const displayName = getModuleDisplayName(m);
    const isTreeOrders = m.name === "tree_orders";

    return (
      <Fragment key={m.id}>
        <TableRow>
          <TableCell className="sticky left-0 z-10 bg-background border-r">
            <div className={cn("flex items-center gap-2", indent && "pl-8")}>
              {isTreeOrders && (
                <button
                  type="button"
                  onClick={() => setTreeOrdersExpanded((v) => !v)}
                  className="flex items-center"
                  aria-label="Toggle sub-features"
                >
                  <ChevronRight className={cn("h-4 w-4 transition-transform", treeOrdersExpanded && "rotate-90")} />
                </button>
              )}
              <div>
                <p className="font-medium flex items-center gap-2">
                  {getModuleCode(m) && (
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">{getModuleCode(m)}</Badge>
                  )}
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground">{m.category}</p>
              </div>
              <Badge variant="outline" className="text-[10px] gap-1 ml-auto">
                {accessType === "scoped" ? (<><Lock className="h-3 w-3" /> Own data</>) : (<><Globe className="h-3 w-3" /> Shared</>)}
              </Badge>
            </div>
          </TableCell>
          {roles.map((role) => renderCell(role, m))}
        </TableRow>

        {isTreeOrders && treeOrdersExpanded && TREE_ORDERS_SUBFEATURES.map((sf) => (
          <TableRow key={sf.key} className="bg-muted/20">
            <TableCell className="sticky left-0 z-10 bg-muted/20 border-r">
              <div className="pl-12 text-sm">{sf.label}</div>
            </TableCell>
            {roles.map((role) => {
              const row = getRow(role.id, m.name);
              const admin = isAdminRole(role);
              const checked = admin ? true : !!(row?.sub_features?.[sf.key]);
              return (
                <TableCell key={role.id} className="text-center">
                  <Switch
                    checked={checked}
                    onCheckedChange={() => toggleSubFeature(role, m.name, sf.key)}
                    disabled={admin}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </Fragment>
    );
  };

  const renderForestGroup = () => (
    <Fragment key="forest-registry-group">
      <TableRow className="bg-muted/40 hover:bg-muted/50">
        <TableCell className="sticky left-0 z-10 bg-muted/40 border-r">
          <button type="button" onClick={() => setForestExpanded((v) => !v)} className="flex items-center gap-2 font-medium w-full text-left">
            <ChevronRight className={cn("h-4 w-4 transition-transform", forestExpanded && "rotate-90")} />
            <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">OM07</Badge>
            <span>Forest Registry</span>
            <Badge variant="outline" className="text-[10px] ml-2">Group · {forestModules.length}</Badge>
          </button>
        </TableCell>
        {roles.map((role) => {
          const admin = isAdminRole(role);
          const enabledCount = admin
            ? forestModules.length
            : forestModules.filter((m: any) => !!getRow(role.id, m.name)?.enabled).length;
          return (
            <TableCell key={role.id} className="text-center">
              <span className="text-[10px] text-muted-foreground">{enabledCount}/{forestModules.length}</span>
            </TableCell>
          );
        })}
      </TableRow>
      {forestExpanded && forestModules.map((m: any) => renderModuleRow(m, true))}
    </Fragment>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Workflow Assignment</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Allocate module access and permissions to each role. Users inherit access from their assigned role.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background min-w-[260px]">Module</TableHead>
                {roles.map((r) => {
                  const cls = ROLE_COLOR_CLASSES[r.color] || ROLE_COLOR_CLASSES.slate;
                  return (
                    <TableHead key={r.id} className="text-center min-w-[140px]">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="secondary" className={cls.pill}>{r.name}</Badge>
                        {r.is_system && (
                          <span className="text-[10px] text-muted-foreground">System · Full access</span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => row.type === "forest" ? renderForestGroup() : renderModuleRow(row.module))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type OrgPermFlags = { read: boolean; write: boolean; edit: boolean; delete: boolean };
