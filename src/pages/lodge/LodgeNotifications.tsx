import { useNavigate } from "react-router-dom";
import { useLodgeAuth } from "@/contexts/LodgeAuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export const LodgeNotifications = () => {
  const navigate = useNavigate();
  const { lodge } = useLodgeAuth();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get organization_id from authenticated user
  const { data: userOrg } = useQuery({
    queryKey: ['user-organization', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();
      return data?.organization_id;
    },
    enabled: !!user,
  });

  const lodgeId = userOrg || lodge?.id;

  const { data: notifications, isLoading, error: queryError } = useQuery({
    queryKey: ['lodge-notifications-all', lodgeId],
    queryFn: async () => {
      if (!lodgeId) {
        console.error('Lodge ID is missing');
        return [];
      }
      
      console.log('Fetching notifications for lodge:', lodgeId);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', lodgeId)
        .eq('recipient_type', 'lodge')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }
      
      console.log('Fetched notifications:', data?.length);
      return data || [];
    },
    enabled: !!lodgeId,
    refetchInterval: false,
    staleTime: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodge-notifications-all'] });
      queryClient.invalidateQueries({ queryKey: ['lodge-unread-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['lodge-notifications'] });
      toast.success('Notification marked as read');
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', lodgeId)
        .eq('recipient_type', 'lodge')
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodge-notifications-all'] });
      queryClient.invalidateQueries({ queryKey: ['lodge-unread-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['lodge-notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: () => {
      toast.error('Failed to mark all notifications as read');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (queryError) {
    console.error('Query error details:', queryError);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive mb-2">Error loading notifications</div>
          <div className="text-sm text-muted-foreground">{queryError.message}</div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="w-8 h-8" />
              Notifications
            </h2>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={() => markAllAsReadMutation.mutate()}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {!notifications || notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-muted-foreground text-center">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`${
                  !notification.is_read ? 'border-l-4 border-l-primary' : ''
                } transition-all hover:shadow-md`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{notification.title}</h4>
                        {!notification.is_read && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                        {notification.priority === 'high' || notification.priority === 'urgent' ? (
                          <Badge variant="destructive" className="text-xs">{notification.priority}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!notification.is_read && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                      {notification.action_url && (
                        <Button 
                          size="sm" 
                          onClick={() => {
                            if (!notification.is_read) {
                              markAsReadMutation.mutate(notification.id);
                            }
                            navigate(notification.action_url!);
                          }}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
