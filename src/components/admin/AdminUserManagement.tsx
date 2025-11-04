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
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all authenticated users from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, username, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch credit balances for each user
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('user_id, balance');

      if (creditsError) throw creditsError;

      const creditsMap = new Map(credits?.map(c => [c.user_id, c.balance]));
      
      const usersWithCredits = profiles?.map(p => ({
        ...p,
        balance: creditsMap.get(p.id) || 0
      })) || [];

      setUsers(usersWithCredits);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustCredits = async () => {
    if (!selectedUser || creditAmount === 0) return;

    try {
      const { error } = await supabase.rpc('adjust_user_credits', {
        target_user_id: selectedUser.id,
        amount: creditAmount
      });

      if (error) throw error;

      toast.success(`Credits ${creditAmount > 0 ? 'added' : 'deducted'} successfully`);
      setAdjustDialogOpen(false);
      setCreditAmount(0);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to adjust credits");
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) throw error;
      toast.success("Password reset email sent");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            User Management
            <Badge variant="secondary">{users.length} total users</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
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
            <div className="flex gap-2">
              <Button onClick={handleAdjustCredits} disabled={creditAmount === 0}>
                Apply Changes
              </Button>
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
