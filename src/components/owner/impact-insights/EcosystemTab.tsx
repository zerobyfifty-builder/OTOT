import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { EcosystemLog } from "@/hooks/useImpactInsights";

const tagFreq = (items: (string | null)[]) => {
  const counts: Record<string, number> = {};
  items
    .filter((s): s is string => !!s && s.trim().length > 0)
    .forEach((s) => {
      counts[s] = (counts[s] || 0) + 1;
    });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

export const EcosystemTab = ({ logs }: { logs: EcosystemLog[] }) => {
  const bioVals = logs.map((l) => Number(l.biodiversity_index)).filter((v) => v > 0);
  const avgBio = bioVals.length ? bioVals.reduce((s, v) => s + v, 0) / bioVals.length : 0;
  const bioPct = Math.min(100, (avgBio / 10) * 100);

  const soilTags = tagFreq(logs.map((l) => l.soil_improvement));
  const waterTags = tagFreq(logs.map((l) => l.water_retention));
  const allPhotos = logs.flatMap((l) => l.photos || []).slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-1">Biodiversity Index</h3>
          <p className="text-xs text-muted-foreground mb-4">Average across {bioVals.length} logs (0–10 scale)</p>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="hsl(142 70% 45%)"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray={`${bioPct * 2.64} 264`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tabular-nums">{avgBio.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">/ 10</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Soil Improvement</h3>
          {soilTags.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No data yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {soilTags.map(([tag, count]) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag} <span className="ml-1 opacity-60">×{count}</span>
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Water Retention</h3>
          {waterTags.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No data yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {waterTags.map(([tag, count]) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag} <span className="ml-1 opacity-60">×{count}</span>
                </Badge>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent Ecosystem Logs</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No ecosystem logs yet</p>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 10).map((l) => (
              <div key={l.id} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="font-mono text-xs">{l.contribution_id}</Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">{format(new Date(l.log_date), "dd MMM yyyy")}</span>
                </div>
                {l.ecosystem_notes && <p className="text-sm text-foreground">{l.ecosystem_notes}</p>}
                <p className="text-xs text-muted-foreground mt-1">By {l.recorded_by}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {allPhotos.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Field Evidence</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {allPhotos.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden bg-muted">
                <img src={src} alt="Ecosystem evidence" className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
