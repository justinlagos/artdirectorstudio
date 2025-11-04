import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserX, Key, Coins, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
  balance: number;
}

export const AdminUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditDescription, setCreditDescription] = useState("");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const USERS_PER_PAGE = 20;

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get total count first
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      setTotalUsers(count || 0);

      // Fetch paginated profiles
      const from = (currentPage - 1) * USERS_PER_PAGE;
      const to = from + USERS_PER_PAGE - 1;
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, username, created_at')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        return;
      }

      // Fetch credit balances for visible users only
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('user_id, balance')
        .in('user_id', profiles.map(p => p.id));

      if (creditsError) {
        console.error("Error fetching credits:", creditsError);
      }

      const creditsMap = new Map(credits?.map(c => [c.user_id, c.balance]) || []);
      
      const usersWithCredits = profiles.map(p => ({
        ...p,
        balance: creditsMap.get(p.id) ?? 0
      }));

      setUsers(usersWithCredits);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustCredits = async () => {
    if (!selectedUser || creditAmount === 0) {
      toast.error("Please enter a valid credit amount");
      return;
    }

    try {
      console.log("Adjusting credits:", {
        user: selectedUser.email,
        amount: creditAmount,
        description: creditDescription
      });

      const { error } = await supabase.rpc('adjust_user_credits', {
        target_user_id: selectedUser.id,
        amount: creditAmount,
        description_text: creditDescription || null
      });

      if (error) {
        console.error("RPC error:", error);
        throw error;
      }

      toast.success(`Successfully ${creditAmount > 0 ? 'added' : 'deducted'} ${Math.abs(creditAmount)} credits for ${selectedUser.email}`);
      
      // Re-fetch user data to get updated balance
      const { data: updatedCredits } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', selectedUser.id)
        .single();
      
      if (updatedCredits) {
        setUsers(prev => prev.map(u => 
          u.id === selectedUser.id 
            ? { ...u, balance: updatedCredits.balance }
            : u
        ));
      }
      
      setAdjustDialogOpen(false);
      setCreditAmount(0);
      setCreditDescription("");
    } catch (error: any) {
      console.error("Failed to adjust credits:", error);
      toast.error(`Failed to adjust credits: ${error.message || 'Unknown error'}`);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      toast.success("Password reset email sent");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    }
  };

  const filteredUsers = searchQuery 
    ? users.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            User Management
            <Badge variant="secondary">{totalUsers} total users</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.username || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      <Badge variant={user.balance < 5 ? "destructive" : "default"}>
                        {user.balance}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setAdjustDialogOpen(true);
                          }}
                        >
                          <Coins className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(user.id, user.email)}
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credits</DialogTitle>
            <DialogDescription>
              Modify credit balance for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Balance: {selectedUser?.balance} credits</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="credits">Amount (positive to add, negative to deduct)</Label>
              <Input
                id="credits"
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(Number(e.target.value))}
                placeholder="e.g. 50 or -10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                type="text"
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                placeholder="e.g. Bonus credits, refund, etc."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdjustCredits} disabled={creditAmount === 0}>
                Apply Changes
              </Button>
              <Button variant="outline" onClick={() => {
                setAdjustDialogOpen(false);
                setCreditAmount(0);
                setCreditDescription("");
              }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
