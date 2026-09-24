import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Activity, Building2, ExternalLink, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ActivityCategory = "tourist" | "partner" | "admin";

export interface ActivityEntry {
  id: string;
  category: ActivityCategory;
  action: string;
  tone: "create" | "update" | "delete" | "neutral";
  resource: string;
  description: string;
  timestamp: string;
  actor?: string;
  href?: string;
}

const ICONS = { tourist: User, partner: Building2, admin: Shield } as const;

const TONES = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  neutral: "bg-gray-100 text-gray-800",
} as const;

export function ActivityFeed({ activities }: { activities: ActivityEntry[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? activities : activities.filter((a) => a.category === filter);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-admin-primary">Activity Feed</CardTitle>
          <span className="text-xs text-muted-foreground">Latest {activities.length} events</span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full" onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tourist">Tourists</TabsTrigger>
            <TabsTrigger value="partner">Partners</TabsTrigger>
            <TabsTrigger value="admin">Admins</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No activities yet</div>
          ) : (
            filtered.map((activity) => {
              const ActionIcon = ICONS[activity.category] ?? Activity;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-admin-primary/10 hover:bg-admin-cream/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-admin-primary/10 flex items-center justify-center flex-shrink-0">
                    <ActionIcon className="h-4 w-4 text-admin-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={TONES[activity.tone]}>{activity.action}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-admin-primary">
                      {activity.resource && `${activity.resource} - `}
                      {activity.description}
                    </p>
                    {activity.actor && <p className="text-xs text-muted-foreground mt-1">{activity.actor}</p>}
                  </div>
                  {activity.href && (
                    <Button variant="ghost" size="icon" className="flex-shrink-0" asChild>
                      <Link to={activity.href} aria-label="Open">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
