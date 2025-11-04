import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface ActiveUser {
  email: string;
  username: string | null;
  total_actions: number;
  last_active: string;
}

export const AdminActiveUsers = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveUsers();
  }, []);

  const fetchActiveUsers = async () => {
    try {
      // Get user activity from credit_transactions
      const { data: transactions, error: transError } = await supabase
        .from('credit_transactions')
        .select('user_id, timestamp')
        .order('timestamp', { ascending: false });

      if (transError) throw transError;

      // Count actions per user
      const userActivity: Record<string, { count: number; lastActive: string }> = {};
      transactions?.forEach(t => {
        if (!userActivity[t.user_id]) {
          userActivity[t.user_id] = { count: 0, lastActive: t.timestamp };
        }
        userActivity[t.user_id].count += 1;
        if (new Date(t.timestamp) > new Date(userActivity[t.user_id].lastActive)) {
          userActivity[t.user_id].lastActive = t.timestamp;
        }
      });

      // Get top 10 most active users
      const topUserIds = Object.entries(userActivity)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([userId]) => userId);

      // Fetch user details
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, username')
        .in('id', topUserIds);

      if (profilesError) throw profilesError;

      const activeUsersData: ActiveUser[] = profiles?.map(p => ({
        email: p.email,
        username: p.username,
        total_actions: userActivity[p.id].count,
        last_active: userActivity[p.id].lastActive,
      })) || [];

      // Sort by total actions
      activeUsersData.sort((a, b) => b.total_actions - a.total_actions);

      setActiveUsers(activeUsersData);
    } catch (error) {
      console.error("Error fetching active users:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading active users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Most Active Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Total Actions</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers.map((user, index) => (
                <TableRow key={user.email}>
                  <TableCell>
                    <Badge variant={index < 3 ? "default" : "secondary"}>
                      #{index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.username || <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>
                    <Badge>{user.total_actions}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.last_active).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};