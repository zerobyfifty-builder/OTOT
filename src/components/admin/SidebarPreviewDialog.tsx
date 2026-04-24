import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  DollarSign,
  TreePine,
  Map,
  Target,
  Sparkles,
  BarChart3,
  Plane,
  MapPin,
  Sprout,
  Leaf,
  Users,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  GENERIC_ROLES,
  PLANTATION_ROLES,
  ROLE_LABELS,
  type StakeholderType,
} from "@/hooks/useOrgStakeholderType";

// Mirrors src/components/stakeholder/StakeholderSidebar.tsx — keep in sync.
const CORE: { key: string; title: string; icon: LucideIcon }[] = [
  { key: "dashboard", title: "Dashboard", icon: Home },
  { key: "financial_management", title: "Climate Funding", icon: DollarSign },
];

const FLAT: Record<string, { title: string; icon: LucideIcon; sortOrder: number }> = {
  trip_management: { title: "Impact Journeys", icon: Map, sortOrder: 0 },
  tree_orders: { title: "Tree Orders", icon: TreePine, sortOrder: 1 },
  outcomes: { title: "Environmental Impact", icon: Target, sortOrder: 4 },
  impact_insights: { title: "Impact Insights", icon: Sparkles, sortOrder: 5 },
  travel_agents: { title: "Travel Agents", icon: Plane, sortOrder: 9 },
  analytics: { title: "Analytics", icon: BarChart3, sortOrder: 99 },
};

const TREE_OPS: Record<string, { title: string; icon: LucideIcon; sortOrder: number }> = {
  tree_management: { title: "Per-Tree Insights", icon: TreePine, sortOrder: 3 },
  community_impact: { title: "Community Impact", icon: Target, sortOrder: 4 },
};

const FOREST_REGISTRY: Record<string, { title: string; icon: LucideIcon }> = {
  mdm_locations: { title: "Forest Locations", icon: MapPin },
  mdm_nurseries: { title: "Nurseries & CBOs", icon: Sprout },
  mdm_species: { title: "Species & Seedlings", icon: Leaf },
  mdm_planters: { title: "Planters Registry", icon: Users },
  mdm_sequestration: { title: "Sequestration Rates", icon: BarChart3 },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
  stakeholderType: StakeholderType;
  /** Module names (e.g. "dashboard", "tree_orders") currently assigned to the org. */
  assignedModuleNames: string[];
}

export function SidebarPreviewDialog({
  open,
  onOpenChange,
  organizationName,
  stakeholderType,
  assignedModuleNames,
}: Props) {
  const roles = stakeholderType === "plantation" ? PLANTATION_ROLES : GENERIC_ROLES;
  const [role, setRole] = useState<string>("org_admin");

  // Load role defaults so non-admin previews can intersect modules.
  const defaultsBucket: "plantation" | "generic" =
    stakeholderType === "plantation" ? "plantation" : "generic";
  const { data: roleDefaults = [] } = useQuery({
    queryKey: ["roleDefaultsForPreview", defaultsBucket],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_job_role_defaults")
        .select("job_role, module_name, permissions")
        .eq("stakeholder_type", defaultsBucket);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const assignedSet = useMemo(() => new Set(assignedModuleNames), [assignedModuleNames]);

  // Effective modules visible to the selected role.
  // org_admin: all assigned modules.
  // Other roles: assigned ∩ (modules with read=true in defaults). If no defaults
  // exist for that role, fall back to all assigned modules (matches runtime behaviour).
  const effective = useMemo(() => {
    if (role === "org_admin") return assignedSet;
    const allowed = new Set<string>();
    let hasAny = false;
    for (const row of roleDefaults as any[]) {
      if (row.job_role !== role) continue;
      hasAny = true;
      const perms = row.permissions || {};
      if (perms.read) allowed.add(row.module_name);
    }
    if (!hasAny) return assignedSet; // No defaults → treat as full visibility.
    const out = new Set<string>();
    assignedSet.forEach((m) => {
      if (allowed.has(m)) out.add(m);
    });
    return out;
  }, [role, roleDefaults, assignedSet]);

  const sidebarColor =
    stakeholderType === "institutional"
      ? "hsl(348 70% 30%)"
      : stakeholderType === "technology"
      ? "hsl(212 100% 50%)"
      : "hsl(138 70% 22%)";

  const coreItems = CORE.filter((c) => effective.has(c.key));
  const flatItems = Object.entries(FLAT)
    .filter(([k]) => effective.has(k))
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([, v]) => v);
  const treeOrders = flatItems.find((i) => i.title === "Tree Orders");
  const otherFlat = flatItems.filter((i) => i.title !== "Tree Orders");
  const treeOps = Object.entries(TREE_OPS)
    .filter(([k]) => effective.has(k))
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([, v]) => v);
  const forest = Object.entries(FOREST_REGISTRY)
    .filter(([k]) => effective.has(k))
    .map(([, v]) => v);

  const totalVisible =
    coreItems.length + flatItems.length + treeOps.length + (forest.length > 0 ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle>Sidebar Preview</DialogTitle>
          <DialogDescription>
            {organizationName} ·{" "}
            <span className="capitalize">{stakeholderType}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Role:</span>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  {ROLE_LABELS[r.key] || r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">
            {totalVisible} item{totalVisible === 1 ? "" : "s"}
          </Badge>
        </div>

        {/* Sidebar mock */}
        <div className="px-6 pb-6">
          <div
            className="rounded-lg overflow-hidden border border-white/10"
            style={{ backgroundColor: sidebarColor }}
          >
            <div className="p-4 border-b border-white/20 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/15 flex items-center justify-center">
                <TreePine className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold text-white">OTOT</span>
            </div>

            <div className="p-2 space-y-0.5">
              {totalVisible === 0 && (
                <p className="text-xs text-white/70 px-3 py-4 text-center">
                  No modules visible for this role.
                </p>
              )}
              {coreItems.map((i) => (
                <SidebarRow key={i.key} icon={i.icon} title={i.title} />
              ))}
              {treeOrders && (
                <SidebarRow icon={treeOrders.icon} title={treeOrders.title} />
              )}
              {treeOps.map((i) => (
                <SidebarRow key={i.title} icon={i.icon} title={i.title} />
              ))}
              {otherFlat.map((i) => (
                <SidebarRow key={i.title} icon={i.icon} title={i.title} />
              ))}
              {forest.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/80 text-sm font-medium">
                    <TreePine className="h-5 w-5" />
                    <span>Forest Registry</span>
                    <ChevronDown className="ml-auto h-4 w-4" />
                  </div>
                  <div className="ml-7 border-l border-white/15 pl-2 space-y-0.5">
                    {forest.map((i) => (
                      <div
                        key={i.title}
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-white/70 text-xs"
                      >
                        <i.icon className="h-3.5 w-3.5" />
                        <span>{i.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Reflects current toggles. Changes save on toggle — this preview
            updates each time you reopen it.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SidebarRow({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/85 text-sm font-medium hover:bg-white/10">
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span>{title}</span>
    </div>
  );
}
