import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, DollarSign, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
  id: string;
  user_id: string;
  amount: number;
  action: string;
  description: string | null;
  timestamp: string;
  user_email?: string;
}

export const AdminActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      const { data: transactions, error: transError } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (transError) throw transError;

      // Get user emails
      const userIds = [...new Set(transactions?.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]));

      const logsWithEmails = transactions?.map(t => ({
        ...t,
        user_email: emailMap.get(t.user_id)
      })) || [];

      setLogs(logsWithEmails);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === "all" || log.action === filter;
    const matchesSearch = searchQuery === "" || 
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getActionBadge = (action: string) => {
    const config: Record<string, { label: string; variant: any }> = {
      admin_credit: { label: "Admin Add", variant: "default" },
      admin_debit: { label: "Admin Deduct", variant: "destructive" },
      purchase: { label: "Purchase", variant: "secondary" },
      deduct: { label: "Usage", variant: "outline" }
    };

    const { label, variant } = config[action] || { label: action, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (loading) {
    return <div>Loading activity logs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Activity Log
          <Badge variant="secondary">{logs.length} entries</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Input
            placeholder="Search by user or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="admin_credit">Admin Add</SelectItem>
              <SelectItem value="admin_debit">Admin Deduct</SelectItem>
              <SelectItem value="purchase">Purchases</SelectItem>
              <SelectItem value="deduct">Usage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.user_email || "Unknown"}</TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    <span className={log.amount > 0 ? "text-green-600" : "text-red-600"}>
                      {log.amount > 0 ? "+" : ""}{log.amount}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.description || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
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
