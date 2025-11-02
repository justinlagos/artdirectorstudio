import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ImageIcon, Sparkles, Upload, TrendingUp, Coins, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  totalAssets: number;
  totalImages: number;
  totalAnalyses: number;
  totalPrompts: number;
  totalShares: number;
  totalViews: number;
  creditsUsed: number;
  creditsRemaining: number;
  assetsByType: Array<{ name: string; value: number }>;
  activityByDay: Array<{ date: string; count: number }>;
  recentActivity: Array<{ type: string; created_at: string }>;
}

export const UserAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all generated assets
      const { data: assets } = await supabase
        .from("generated_assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch shared assets stats
      const { data: shares } = await supabase
        .from("shared_assets")
        .select("view_count")
        .eq("user_id", user.id);

      // Fetch credits
      const { data: credits } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      // Fetch credit transactions
      const { data: transactions } = await supabase
        .from("credit_transactions")
        .select("amount, action")
        .eq("user_id", user.id);

      const totalImages = assets?.filter(a => a.type === "image").length || 0;
      const totalAnalyses = assets?.filter(a => a.type === "analysis").length || 0;
      const totalPrompts = assets?.filter(a => a.type === "prompt").length || 0;
      
      const totalViews = shares?.reduce((sum, s) => sum + s.view_count, 0) || 0;
      
      const creditsSpent = transactions
        ?.filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      // Group assets by type for pie chart
      const assetsByType = [
        { name: "Images", value: totalImages },
        { name: "Analyses", value: totalAnalyses },
        { name: "Prompts", value: totalPrompts },
      ].filter(item => item.value > 0);

      // Activity by day (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split("T")[0];
      }).reverse();

      const activityByDay = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: assets?.filter(a => a.created_at.startsWith(date)).length || 0,
      }));

      setAnalytics({
        totalAssets: assets?.length || 0,
        totalImages,
        totalAnalyses,
        totalPrompts,
        totalShares: shares?.length || 0,
        totalViews,
        creditsUsed: creditsSpent,
        creditsRemaining: credits?.balance || 0,
        assetsByType,
        activityByDay,
        recentActivity: assets?.slice(0, 5).map(a => ({
          type: a.type,
          created_at: a.created_at,
        })) || [],
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!analytics) {
    return <div>Failed to load analytics</div>;
  }

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))"];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalImages} images, {analytics.totalAnalyses} analyses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shares</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalShares}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalViews} total views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.creditsUsed}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.creditsRemaining} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.activityByDay.reduce((sum, d) => sum + d.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Assets created
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Over Time</CardTitle>
              <CardDescription>Your asset creation in the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  count: {
                    label: "Assets",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.activityByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assets by Type</CardTitle>
              <CardDescription>Distribution of your generated content</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  value: {
                    label: "Count",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.assetsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {analytics.assetsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
