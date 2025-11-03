import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface ActionDistribution {
  name: string;
  value: number;
  fill: string;
}

interface DailyUsage {
  date: string;
  count: number;
}

export const AdminUsagePatterns = () => {
  const [actionData, setActionData] = useState<ActionDistribution[]>([]);
  const [dailyData, setDailyData] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsagePatterns();
  }, []);

  const fetchUsagePatterns = async () => {
    try {
      // Get action distribution
      const { data: transactions, error: transError } = await supabase
        .from('credit_transactions')
        .select('action');

      if (transError) throw transError;

      // Count actions
      const actionCounts: Record<string, number> = {};
      transactions?.forEach(t => {
        actionCounts[t.action] = (actionCounts[t.action] || 0) + 1;
      });

      const colors = {
        analyze: "hsl(var(--primary))",
        generate: "hsl(220, 70%, 50%)",
        refine: "hsl(280, 70%, 50%)",
        upscale: "hsl(340, 70%, 50%)",
        blend: "hsl(30, 70%, 50%)",
        purchase: "hsl(140, 70%, 50%)",
      };

      const actionDistribution: ActionDistribution[] = Object.entries(actionCounts).map(([action, count]) => ({
        name: action.charAt(0).toUpperCase() + action.slice(1),
        value: count,
        fill: colors[action as keyof typeof colors] || "hsl(var(--muted))",
      }));

      setActionData(actionDistribution);

      // Get daily usage for last 7 days
      const { data: assets, error: assetsError } = await supabase
        .from('generated_assets')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (assetsError) throw assetsError;

      const dailyCounts: Record<string, number> = {};
      assets?.forEach(asset => {
        const date = new Date(asset.created_at).toLocaleDateString();
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      const dailyUsage: DailyUsage[] = Object.entries(dailyCounts).map(([date, count]) => ({
        date,
        count,
      }));

      setDailyData(dailyUsage);
    } catch (error) {
      console.error("Error fetching usage patterns:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading usage patterns...</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Action Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={actionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {actionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};