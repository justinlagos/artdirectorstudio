import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, Users, TrendingUp, Check, X, Send } from "lucide-react";

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  status: string;
  created_at: string;
  invite_sent_at: string | null;
}

interface FunnelMetric {
  event_type: string;
  count: number;
}

export const AdminBetaManagement = () => {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [metrics, setMetrics] = useState<FunnelMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch waitlist
      const { data: waitlistData, error: waitlistError } = await supabase
        .from("beta_waitlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (waitlistError) throw waitlistError;
      setWaitlist(waitlistData || []);

      // Fetch funnel metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from("funnel_metrics")
        .select("event_type")
        .order("created_at", { ascending: false });

      if (metricsError) throw metricsError;

      // Count events
      const counts = (metricsData || []).reduce((acc: Record<string, number>, metric) => {
        acc[metric.event_type] = (acc[metric.event_type] || 0) + 1;
        return acc;
      }, {});

      setMetrics(
        Object.entries(counts).map(([event_type, count]) => ({
          event_type,
          count: count as number,
        }))
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!selectedEntry) return;

    setSendingInvite(true);
    try {
      const { error } = await supabase.functions.invoke("send-beta-invite", {
        body: {
          waitlistId: selectedEntry.id,
          customMessage: customMessage || undefined,
        },
      });

      if (error) throw error;

      toast.success(`Invite sent to ${selectedEntry.email}`);
      setSelectedEntry(null);
      setCustomMessage("");
      fetchData();
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast.error(error.message || "Failed to send invite");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("beta_waitlist")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success("Status updated");
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "invited":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const filteredWaitlist = waitlist.filter(
    (entry) =>
      entry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const totalSignups = waitlist.length;
  const pendingCount = waitlist.filter((e) => e.status === "pending").length;
  const invitedCount = waitlist.filter((e) => e.status === "invited").length;
  const activeCount = waitlist.filter((e) => e.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold">Beta Management</h2>
        <p className="text-muted-foreground">
          Manage beta waitlist, send invites, and track funnel metrics
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSignups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invited</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Metrics */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Funnel Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {metrics.map((metric) => (
                <div key={metric.event_type} className="text-center">
                  <p className="text-2xl font-bold">{metric.count}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {metric.event_type.replace("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waitlist Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Beta Waitlist</CardTitle>
            <Input
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWaitlist.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
                    <TableCell>{entry.name || "-"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {entry.status === "pending" && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setSelectedEntry(entry)}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Invite
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Send Beta Invite</DialogTitle>
                                <DialogDescription>
                                  Send a beta invite to {entry.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Add a personal message (optional)"
                                  value={customMessage}
                                  onChange={(e) => setCustomMessage(e.target.value)}
                                  rows={4}
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedEntry(null);
                                      setCustomMessage("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleSendInvite}
                                    disabled={sendingInvite}
                                  >
                                    {sendingInvite ? "Sending..." : "Send Invite"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        {entry.status !== "active" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateStatus(entry.id, "active")}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}

                        {entry.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateStatus(entry.id, "rejected")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
