import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Activity, User, Building2, Shield, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ActivityLog {
  id: string;
  action_type: string;
  resource_type: string;
  timestamp: string;
  user_id: string;
  organization_id: string | null;
  metadata: any;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          setActivities(prev => [payload.new as ActivityLog, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    // Refresh every 5 seconds
    const interval = setInterval(fetchActivities, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('user')) return User;
    if (actionType.includes('partner') || actionType.includes('organization')) return Building2;
    if (actionType.includes('admin')) return Shield;
    return Activity;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('create')) return 'bg-green-100 text-green-800';
    if (actionType.includes('update')) return 'bg-blue-100 text-blue-800';
    if (actionType.includes('delete')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.action_type.includes(filter));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-admin-primary">Real-Time Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-admin-primary">Real-Time Activity Feed</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
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
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activities yet
            </div>
          ) : (
            filteredActivities.map((activity) => {
              const ActionIcon = getActionIcon(activity.action_type);
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
                      <Badge className={getActionColor(activity.action_type)}>
                        {activity.action_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-admin-primary">
                      {activity.resource_type && `${activity.resource_type} - `}
                      {activity.metadata?.description || 'Activity performed'}
                    </p>
                    {activity.user_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        User ID: {activity.user_id.substring(0, 8)}...
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
