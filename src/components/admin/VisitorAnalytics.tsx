import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Eye, Users, Clock, MousePointer } from 'lucide-react';

type TimeFilter = 'today' | '7days' | '30days' | '90days' | 'all';

interface AnalyticsData {
  totalPageViews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number }>;
  viewsOverTime: Array<{ date: string; views: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  referrerSources: Array<{ source: string; count: number }>;
}

export function VisitorAnalytics() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7days');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalPageViews: 0,
    uniqueVisitors: 0,
    avgTimeOnPage: 0,
    bounceRate: 0,
    topPages: [],
    viewsOverTime: [],
    deviceBreakdown: [],
    referrerSources: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitorAnalytics();
  }, [timeFilter]);

  const getDateFilter = () => {
    const now = new Date();
    switch(timeFilter) {
      case 'today':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return today.toISOString();
      case '7days':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case '30days':
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case '90days':
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      default:
        return new Date(0).toISOString();
    }
  };

  const fetchVisitorAnalytics = async () => {
    setLoading(true);
    const dateFilter = getDateFilter();

    try {
      // Total page views
      const { count: pageViews } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateFilter);

      // Unique visitors
      const { data: uniqueData } = await supabase
        .from('page_views')
        .select('session_id')
        .gte('created_at', dateFilter);
      const uniqueVisitors = new Set(uniqueData?.map(v => v.session_id)).size;

      // Average time on page
      const { data: timeData } = await supabase
        .from('page_views')
        .select('time_on_page')
        .gte('created_at', dateFilter)
        .not('time_on_page', 'is', null);
      const avgTime = timeData?.length 
        ? Math.round(timeData.reduce((sum, v) => sum + (v.time_on_page || 0), 0) / timeData.length)
        : 0;

      // Bounce rate
      const { count: bounces } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateFilter)
        .eq('is_bounce', true);
      const bounceRate = pageViews ? Math.round((bounces || 0) / pageViews * 100) : 0;

      // Top pages
      const { data: pagesData } = await supabase
        .from('page_views')
        .select('page_path')
        .gte('created_at', dateFilter);
      const pageCounts: Record<string, number> = {};
      pagesData?.forEach(v => {
        pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1;
      });
      const topPages = Object.entries(pageCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([page, count]) => ({ page, views: count as number }));

      // Views over time (daily aggregation)
      const { data: timeSeriesData } = await supabase
        .from('page_views')
        .select('created_at')
        .gte('created_at', dateFilter)
        .order('created_at');
      
      const viewsByDay: Record<string, number> = {};
      timeSeriesData?.forEach(v => {
        const day = new Date(v.created_at).toLocaleDateString();
        viewsByDay[day] = (viewsByDay[day] || 0) + 1;
      });
      const viewsOverTime = Object.entries(viewsByDay).map(([date, views]) => ({ date, views }));

      // Device breakdown
      const { data: deviceData } = await supabase
        .from('page_views')
        .select('device_type')
        .gte('created_at', dateFilter);
      const deviceCounts: Record<string, number> = {};
      deviceData?.forEach(v => {
        if (v.device_type) {
          deviceCounts[v.device_type] = (deviceCounts[v.device_type] || 0) + 1;
        }
      });
      const deviceBreakdown = Object.entries(deviceCounts).map(([device, count]) => ({ 
        device: device.charAt(0).toUpperCase() + device.slice(1), 
        count 
      }));

      // Top referrers
      const { data: referrerData } = await supabase
        .from('page_views')
        .select('referrer')
        .gte('created_at', dateFilter)
        .not('referrer', 'is', null);
      const referrerCounts: Record<string, number> = {};
      referrerData?.forEach(v => {
        try {
          const domain = v.referrer ? new URL(v.referrer).hostname : 'Direct';
          referrerCounts[domain] = (referrerCounts[domain] || 0) + 1;
        } catch {
          referrerCounts['Direct'] = (referrerCounts['Direct'] || 0) + 1;
        }
      });
      const referrerSources = Object.entries(referrerCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([source, count]) => ({ source, count }));

      setAnalytics({
        totalPageViews: pageViews || 0,
        uniqueVisitors,
        avgTimeOnPage: avgTime,
        bounceRate,
        topPages,
        viewsOverTime,
        deviceBreakdown,
        referrerSources
      });
    } catch (error) {
      console.error('Error fetching visitor analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading visitor analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Visitor Analytics</h2>
        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPageViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueVisitors.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time on Page</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgTimeOnPage}s</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.bounceRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Page Views Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Page Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.viewsOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={analytics.deviceBreakdown} 
                  dataKey="count" 
                  nameKey="device" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={80} 
                  label
                >
                  {analytics.deviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topPages}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="page" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="views" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.referrerSources} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="source" type="category" width={100} className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
