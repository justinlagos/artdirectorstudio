import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Star, Award, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
  id: string;
  shared_asset_id: string;
  admin_id: string;
  admin_email: string;
  action_type: 'featured' | 'unfeatured' | 'staff_pick_added' | 'staff_pick_removed';
  created_at: string;
  asset?: {
    image_url?: string;
  };
}

export const InspireActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('inspire_activity')
        .select(`
          *,
          shared_assets!inspire_activity_shared_asset_id_fkey(
            asset_id,
            generated_assets!shared_assets_asset_id_fkey(
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        id: item.id,
        shared_asset_id: item.shared_asset_id,
        admin_id: item.admin_id,
        admin_email: item.admin_email,
        action_type: item.action_type as ActivityLog['action_type'],
        created_at: item.created_at,
        asset: item.shared_assets?.generated_assets
      }));
      
      setActivities(transformedData);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Real-time subscription for new activities
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inspire_activity'
        },
        async (payload) => {
          console.log('New activity received:', payload);
          
          // Fetch the full activity with asset details
          const { data } = await supabase
            .from('inspire_activity')
            .select(`
              *,
              shared_assets!inspire_activity_shared_asset_id_fkey(
                asset_id,
                generated_assets!shared_assets_asset_id_fkey(
                  image_url
                )
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const transformedData = {
              id: data.id,
              shared_asset_id: data.shared_asset_id,
              admin_id: data.admin_id,
              admin_email: data.admin_email,
              action_type: data.action_type as ActivityLog['action_type'],
              created_at: data.created_at,
              asset: data.shared_assets?.generated_assets
            };
            
            setActivities(prev => [transformedData, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'featured':
      case 'unfeatured':
        return <Star className="w-4 h-4" />;
      case 'staff_pick_added':
      case 'staff_pick_removed':
        return <Award className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getActionText = (actionType: string) => {
    switch (actionType) {
      case 'featured':
        return 'Featured an item';
      case 'unfeatured':
        return 'Unfeatured an item';
      case 'staff_pick_added':
        return 'Added a staff pick';
      case 'staff_pick_removed':
        return 'Removed a staff pick';
      default:
        return actionType;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'featured':
      case 'staff_pick_added':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'unfeatured':
      case 'staff_pick_removed':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  if (loading) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/5 transition-colors animate-fade-in"
              >
                {activity.asset?.image_url && (
                  <img
                    src={activity.asset.image_url}
                    alt="Asset preview"
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-xs ${getActionColor(activity.action_type)}`}>
                      {getActionIcon(activity.action_type)}
                      <span className="ml-1">{getActionText(activity.action_type)}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    by <span className="font-medium text-foreground">{activity.admin_email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
