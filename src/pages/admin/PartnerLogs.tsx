import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogsTab } from "@/components/owner/settings/LogsTab";
import { Landmark, Briefcase, Building2 } from "lucide-react";

interface OrgRow {
  id: string;
  name: string;
  partner_types: { name: string; category: string } | null;
  category: string;
}

type GroupKey = "government" | "business" | "other";

const GROUP_META: Record<GroupKey, { label: string; icon: React.ComponentType<any> }> = {
  institutional: { label: "Institutional", icon: Landmark },
  business: { label: "Business", icon: Briefcase },
  other: { label: "Other", icon: Building2 },
};

function groupOf(o: OrgRow): GroupKey {
  const cat = (o.category || "").toLowerCase();
  if (cat === "government") return "government";
  if (cat === "business") return "business";
  return "other";
}

export default function PartnerLogs() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<GroupKey>("government");
  const [selectedOrg, setSelectedOrg] = useState<Record<GroupKey, string | null>>({
    institutional: null, business: null, other: null,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, category, partner_types(name, category)")
        .in("category", ["government", "business"])
        .eq("archived", false)
        .order("name");
      if (!error) setOrgs((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const g: Record<GroupKey, OrgRow[]> = { institutional: [], business: [], other: [] };
    orgs.forEach((o) => g[groupOf(o)].push(o));
    return g;
  }, [orgs]);

  useEffect(() => {
    setSelectedOrg((prev) => {
      const next = { ...prev };
      (Object.keys(grouped) as GroupKey[]).forEach((k) => {
        if (!next[k] && grouped[k][0]) next[k] = grouped[k][0].id;
      });
      return next;
    });
  }, [grouped]);

  const visibleGroups = (Object.keys(GROUP_META) as GroupKey[]).filter((k) => grouped[k].length > 0);
  const currentGroups = visibleGroups.length ? visibleGroups : (["government"] as GroupKey[]);

  return (
    <div className="space-y-6">
      <Tabs value={activeGroup} onValueChange={(v) => setActiveGroup(v as GroupKey)} className="w-full">
        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 gap-1 overflow-x-auto">
          {currentGroups.map((k) => {
            const Icon = GROUP_META[k].icon;
            return (
              <TabsTrigger
                key={k}
                value={k}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none gap-2 px-4 py-2.5"
              >
                <Icon className="h-4 w-4" /> {GROUP_META[k].label}
                <span className="ml-1 text-xs text-muted-foreground">({grouped[k].length})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {currentGroups.map((k) => (
          <TabsContent key={k} value={k} className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>{GROUP_META[k].label} Partners</CardTitle>
                    <CardDescription>Choose an organization to view its activity logs.</CardDescription>
                  </div>
                  <Select
                    value={selectedOrg[k] || undefined}
                    onValueChange={(v) => setSelectedOrg((s) => ({ ...s, [k]: v }))}
                    disabled={loading || grouped[k].length === 0}
                  >
                    <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select organization" /></SelectTrigger>
                    <SelectContent>
                      {grouped[k].map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {grouped[k].length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">No {GROUP_META[k].label.toLowerCase()} partners.</div>
                ) : (
                  <LogsTab organizationId={selectedOrg[k]} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
