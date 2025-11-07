import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Coins, ImageIcon, TrendingUp, DollarSign, UserPlus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface AnalyticsData {
  totalUsers: number;
  totalCreditsDistributed: number;
  totalAnalyses: number;
  averageCreditsPerUser: number;
  usersByTier: { tier: string; count: number }[];
  totalRevenue: number;
  monthlyRevenue: number;
  conversionRate: number;
  paidUsers: number;
  revenueOverTime: { date: string; amount: number }[];
}

export const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalCreditsDistributed: 0,
    totalAnalyses: 0,
    averageCreditsPerUser: 0,
    usersByTier: [],
    totalRevenue: 0,
    monthlyRevenue: 0,
    conversionRate: 0,
    paidUsers: 0,
    revenueOverTime: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Get total users
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get total credits distributed
        const { data: creditsData } = await supabase
          .from('credits')
          .select('balance');

        const totalCredits = creditsData?.reduce((sum, c) => sum + c.balance, 0) || 0;

        // Get total analyses
        const { count: analysesCount } = await supabase
          .from('generated_assets')
          .select('*', { count: 'exact', head: true });

        // Get users by tier
        const { data: tierData } = await supabase
          .from('profiles')
          .select('subscription_tier');

        const tierCounts = tierData?.reduce((acc, profile) => {
          const tier = profile.subscription_tier || 'free';
          acc[tier] = (acc[tier] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const usersByTier = Object.entries(tierCounts).map(([tier, count]) => ({
          tier: tier.charAt(0).toUpperCase() + tier.slice(1),
          count,
        }));

        // Get revenue metrics
        const { data: billingData } = await supabase
          .from('billing_events')
          .select('amount_cents, created_at, event_type')
          .in('event_type', ['subscription_payment', 'credit_purchase']);

        const totalRevenue = billingData?.reduce((sum, event) => sum + (event.amount_cents || 0), 0) || 0;

        // Calculate monthly revenue (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const monthlyRevenue = billingData?.filter(event => 
          new Date(event.created_at) >= thirtyDaysAgo
        ).reduce((sum, event) => sum + (event.amount_cents || 0), 0) || 0;

        // Revenue over time (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentRevenue = billingData?.filter(event => 
          new Date(event.created_at) >= sevenDaysAgo
        ) || [];

        const revenueByDay = recentRevenue.reduce((acc, event) => {
          const date = new Date(event.created_at).toLocaleDateString();
          acc[date] = (acc[date] || 0) + (event.amount_cents || 0);
          return acc;
        }, {} as Record<string, number>);

        const revenueOverTime = Object.entries(revenueByDay).map(([date, amount]) => ({
          date,
          amount: amount / 100, // Convert to dollars
        }));

        // Get paid users count
        const { count: paidUsersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_pro', true);

        // Calculate conversion rate
        const conversionRate = userCount && paidUsersCount 
          ? (paidUsersCount / userCount) * 100 
          : 0;

        setAnalytics({
          totalUsers: userCount || 0,
          totalCreditsDistributed: totalCredits,
          totalAnalyses: analysesCount || 0,
          averageCreditsPerUser: userCount ? totalCredits / userCount : 0,
          usersByTier,
          totalRevenue: totalRevenue / 100, // Convert to dollars
          monthlyRevenue: monthlyRevenue / 100,
          conversionRate,
          paidUsers: paidUsersCount || 0,
          revenueOverTime,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.paidUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.conversionRate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${analytics.monthlyRevenue.toFixed(2)} last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAnalyses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Users by Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Subscription Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.usersByTier}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tier" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits in System</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCreditsDistributed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Credits/User</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.averageCreditsPerUser.toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Free to paid conversion
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
