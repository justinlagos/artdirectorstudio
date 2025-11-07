import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Mail, 
  UserPlus, 
  Clock, 
  CheckCircle2,
  Calendar,
  TrendingUp
} from "lucide-react";

interface BetaInvite {
  id: string;
  email: string;
  code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  waitlist: {
    name: string | null;
    status: string;
    activated_at: string | null;
  } | null;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  status: string;
  created_at: string;
  activated_at: string | null;
}

export const InviteTracking = () => {
  const [invites, setInvites] = useState<BetaInvite[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInvites: 0,
    usedInvites: 0,
    conversionRate: 0,
    waitlistTotal: 0,
    activatedUsers: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('beta_invites')
        .select(`
          *,
          waitlist:beta_waitlist!beta_invites_waitlist_id_fkey (
            name,
            status,
            activated_at
          )
        `)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      // Fetch waitlist
      const { data: waitlistData, error: waitlistError } = await supabase
        .from('beta_waitlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (waitlistError) throw waitlistError;

      setInvites((invitesData as unknown as BetaInvite[]) || []);
      setWaitlist(waitlistData || []);

      // Calculate stats
      const totalInvites = invitesData?.length || 0;
      const usedInvites = invitesData?.filter(i => i.used_at !== null).length || 0;
      const conversionRate = totalInvites > 0 ? (usedInvites / totalInvites) * 100 : 0;
      const waitlistTotal = waitlistData?.length || 0;
      const activatedUsers = waitlistData?.filter(w => w.activated_at !== null).length || 0;

      setStats({
        totalInvites,
        usedInvites,
        conversionRate,
        waitlistTotal,
        activatedUsers
      });
    } catch (error) {
      console.error("Error fetching invite data:", error);
      toast.error("Failed to load invite tracking data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return <div>Loading invite data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invites</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvites}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Invites</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usedInvites}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waitlist</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waitlistTotal}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activated</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activatedUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invites Table */}
      <Card>
        <CardHeader>
          <CardTitle>Beta Invites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No invites found
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          {invite.waitlist?.name && (
                            <p className="text-xs text-muted-foreground">{invite.waitlist.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {invite.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        {invite.used_at ? (
                          <Badge variant="default">Used</Badge>
                        ) : isExpired(invite.expires_at) ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(invite.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(invite.expires_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {invite.used_at ? (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {formatDate(invite.used_at)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Waitlist Table */}
      <Card>
        <CardHeader>
          <CardTitle>Waitlist Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed Up</TableHead>
                  <TableHead>Activated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No waitlist entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  waitlist.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <p className="font-medium">{entry.name || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{entry.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            entry.status === 'activated' ? 'default' : 
                            entry.status === 'invited' ? 'secondary' : 
                            'outline'
                          }
                          className="capitalize"
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(entry.created_at)}</span>
                      </TableCell>
                      <TableCell>
                        {entry.activated_at ? (
                          <span className="text-sm text-green-600">
                            {formatDate(entry.activated_at)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};