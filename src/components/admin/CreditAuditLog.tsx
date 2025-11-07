import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Search, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  action: string | null;
  provider: string | null;
  description: string | null;
  notes: string | null;
  timestamp: string;
  profiles?: {
    email: string;
  };
}

export const CreditAuditLog = () => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "credit" | "debit" | "admin">("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchTransactions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('credit-audit-log')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_transactions'
        },
        () => {
          console.log('💳 Credit transaction updated, refreshing...');
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, filterType]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch user emails separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
        
        const transactionsWithEmails = data.map(t => ({
          ...t,
          profiles: { email: profilesMap.get(t.user_id) || 'Unknown' }
        }));

        console.log('✅ Fetched', transactionsWithEmails.length, 'credit transactions');
        setTransactions(transactionsWithEmails);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching credit transactions:', error);
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by search term (email or description)
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType === "credit") {
      filtered = filtered.filter(t => t.amount > 0);
    } else if (filterType === "debit") {
      filtered = filtered.filter(t => t.amount < 0);
    } else if (filterType === "admin") {
      filtered = filtered.filter(t => t.action === null && t.provider === null);
    }

    setFilteredTransactions(filtered);
    setPage(1); // Reset to first page when filters change
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Email', 'Amount', 'Type', 'Action', 'Provider', 'Description', 'Notes'];
    const csvData = filteredTransactions.map(t => [
      format(new Date(t.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      t.profiles?.email || 'Unknown',
      t.amount,
      t.amount > 0 ? 'Credit' : 'Debit',
      t.action || 'Admin',
      t.provider || 'Admin',
      t.description || '',
      t.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Audit log exported successfully');
  };

  const getTransactionIcon = (amount: number) => {
    if (amount > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (amount < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTransactionBadge = (transaction: CreditTransaction) => {
    if (transaction.action === null && transaction.provider === null) {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">Admin Adjustment</Badge>;
    }
    if (transaction.amount > 0) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Credit</Badge>;
    }
    return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">Debit</Badge>;
  };

  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const stats = {
    total: transactions.length,
    adminAdjustments: transactions.filter(t => t.action === null && t.provider === null).length,
    totalCredits: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    totalDebits: Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Audit Log</CardTitle>
          <CardDescription>Loading transaction history...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Admin Adjustments</CardDescription>
            <CardTitle className="text-3xl text-purple-500">{stats.adminAdjustments}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Credits Added</CardDescription>
            <CardTitle className="text-3xl text-green-500">+{stats.totalCredits}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Credits Used</CardDescription>
            <CardTitle className="text-3xl text-red-500">-{stats.totalDebits}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Credit Transaction Audit Log</CardTitle>
              <CardDescription>
                Complete history of all credit transactions with real-time updates
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchTransactions}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, description, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="credit">Credits Only</SelectItem>
                <SelectItem value="debit">Debits Only</SelectItem>
                <SelectItem value="admin">Admin Adjustments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">
            Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
          </p>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">
                        {format(new Date(transaction.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.profiles?.email || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.amount)}
                          <span className={`font-semibold ${
                            transaction.amount > 0 
                              ? 'text-green-500' 
                              : transaction.amount < 0 
                              ? 'text-red-500' 
                              : 'text-muted-foreground'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTransactionBadge(transaction)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {transaction.action || <span className="text-muted-foreground italic">Admin</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {transaction.provider || <span className="text-muted-foreground italic">Admin</span>}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {transaction.description || transaction.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};