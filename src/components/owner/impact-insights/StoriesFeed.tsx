import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Cloud, Leaf, Users } from "lucide-react";
import type {
  CarbonLog,
  EcosystemLog,
  CommunityLog,
} from "@/hooks/useImpactInsights";

interface Story {
  id: string;
  kind: "carbon" | "ecosystem" | "community";
  contribution_id: string;
  date: string;
  recorded_by: string;
  notes?: string | null;
  metric?: { label: string; value: string };
  photo?: string | null;
}

const buildStories = (
  carbon: CarbonLog[],
  ecosystem: EcosystemLog[],
  community: CommunityLog[],
): Story[] => {
  const stories: Story[] = [];

  carbon.forEach((c) => {
    const value =
      c.co2_offset_actual_kg ??
      c.co2_offset_estimated_kg ??
      0;
    stories.push({
      id: `c-${c.id}`,
      kind: "carbon",
      contribution_id: c.contribution_id,
      date: c.log_date,
      recorded_by: c.recorded_by,
      notes: c.notes,
      metric: { label: "CO₂", value: `${Math.round(Number(value))} kg` },
      photo: c.photos?.[0] ?? null,
    });
  });

  ecosystem.forEach((e) => {
    stories.push({
      id: `e-${e.id}`,
      kind: "ecosystem",
      contribution_id: e.contribution_id,
      date: e.log_date,
      recorded_by: e.recorded_by,
      notes: e.ecosystem_notes,
      metric: e.biodiversity_index
        ? { label: "Biodiversity", value: `${Number(e.biodiversity_index).toFixed(1)} / 10` }
        : undefined,
      photo: e.photos?.[0] ?? null,
    });
  });

  community.forEach((m) => {
    const headcount =
      (Number(m.jobs_created) || 0) +
      (Number(m.families_supported) || 0) +
      (Number(m.local_participants_count) || 0);
    stories.push({
      id: `m-${m.id}`,
      kind: "community",
      contribution_id: m.contribution_id,
      date: m.log_date,
      recorded_by: m.recorded_by,
      notes: m.community_benefits,
      metric: headcount
        ? { label: "Lives", value: headcount.toLocaleString() }
        : undefined,
      photo: m.photos?.[0] ?? null,
    });
  });

  return stories.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};

const kindMeta = {
  carbon: { icon: Cloud, label: "Carbon", tint: "bg-sky-50 text-sky-700 border-sky-200" },
  ecosystem: { icon: Leaf, label: "Ecosystem", tint: "bg-lime-50 text-lime-700 border-lime-200" },
  community: { icon: Users, label: "Community", tint: "bg-amber-50 text-amber-700 border-amber-200" },
} as const;

export const StoriesFeed = ({
  carbon,
  ecosystem,
  community,
}: {
  carbon: CarbonLog[];
  ecosystem: EcosystemLog[];
  community: CommunityLog[];
}) => {
  const stories = buildStories(carbon, ecosystem, community);

  if (stories.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-sm text-muted-foreground">No stories yet — log impact from a tree order to begin.</p>
      </Card>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
      {stories.map((s) => {
        const Meta = kindMeta[s.kind];
        const Icon = Meta.icon;
        return (
          <Card key={s.id} className="mb-4 break-inside-avoid overflow-hidden border shadow-sm">
            {s.photo && (
              <div className="aspect-video bg-muted">
                <img src={s.photo} alt="Impact story" className="w-full h-full object-cover" loading="lazy" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${Meta.tint}`}>
                  <Icon className="h-3 w-3" /> {Meta.label}
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">{s.contribution_id}</Badge>
              </div>
              {s.metric && (
                <p className="text-2xl font-semibold tabular-nums text-foreground mb-1">
                  {s.metric.value}
                  <span className="text-xs font-normal text-muted-foreground ml-2">{s.metric.label}</span>
                </p>
              )}
              {s.notes && <p className="text-sm text-foreground/80 leading-relaxed">{s.notes}</p>}
              <p className="text-xs text-muted-foreground mt-3 tabular-nums">
                {format(new Date(s.date), "dd MMM yyyy")} • {s.recorded_by}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
