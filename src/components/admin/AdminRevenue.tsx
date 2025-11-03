import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, ShoppingCart, CreditCard } from "lucide-react";

interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalPurchases: number;
  averageOrderValue: number;
}

export const AdminRevenue = () => {
  const [metrics, setMetrics] = useState<RevenueMetrics>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalPurchases: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueMetrics();
  }, []);

  const fetchRevenueMetrics = async () => {
    try {
      // Get all credit transactions for revenue calculation
      const { data: purchases, error } = await supabase
        .from('credit_transactions')
        .select('amount, timestamp, action');

      if (error) throw error;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let totalPurchases = 0;

      purchases?.forEach((purchase) => {
        // Only count positive amounts (credits added)
        if (purchase.amount > 0) {
          totalPurchases++;
          // Assuming $0.10 per credit
          const revenue = (purchase.amount * 0.10);
          totalRevenue += revenue;

          const purchaseDate = new Date(purchase.timestamp);
          if (purchaseDate >= firstDayOfMonth) {
            monthlyRevenue += revenue;
          }
        }
      });

      const averageOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

      setMetrics({
        totalRevenue,
        monthlyRevenue,
        totalPurchases,
        averageOrderValue,
      });
    } catch (error) {
      console.error("Error fetching revenue metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading revenue metrics...</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">All-time earnings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${metrics.monthlyRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalPurchases}</div>
          <p className="text-xs text-muted-foreground">Completed transactions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${metrics.averageOrderValue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Per transaction</p>
        </CardContent>
      </Card>
    </div>
  );
};