import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface BillingEvent {
  id: string;
  event_type: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  status: string;
  stripe_payment_intent?: string;
  stripe_subscription_id?: string;
  stripe_invoice_id?: string;
  metadata?: any;
}

export default function BillingHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailingSending, setEmailingSending] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth', { 
        state: { message: "Please sign in to view your billing history." }
      });
      return;
    }

    fetchBillingHistory();
  }, [user, navigate]);

  const fetchBillingHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('billing_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching billing history:", error);
      toast.error("Failed to load billing history");
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getEventTypeBadge = (eventType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      subscription_charge: "default",
      subscription_cancel: "destructive",
      trial_credit_grant: "secondary",
      refund: "destructive",
    };

    const labels: Record<string, string> = {
      subscription_charge: "Subscription",
      subscription_cancel: "Cancelled",
      trial_credit_grant: "Trial Credits",
      refund: "Refund",
    };

    return (
      <Badge variant={variants[eventType] || "default"}>
        {labels[eventType] || eventType}
      </Badge>
    );
  };

  const downloadInvoice = (event: BillingEvent) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Invoice", 20, 20);

    doc.setFontSize(12);
    doc.text(`Date: ${formatDate(event.created_at)}`, 20, 40);
    doc.text(`Type: ${event.event_type}`, 20, 50);
    doc.text(`Amount: ${formatAmount(event.amount_cents, event.currency)}`, 20, 60);
    doc.text(`Status: ${event.status}`, 20, 70);

    if (event.stripe_invoice_id) {
      doc.text(`Invoice ID: ${event.stripe_invoice_id}`, 20, 80);
    }

    doc.save(`invoice-${event.id}.pdf`);
    toast.success("Invoice downloaded");
  };

  const emailInvoice = async (event: BillingEvent) => {
    if (!user?.email) return;

    setEmailingSending(event.id);
    try {
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          email: user.email,
          eventId: event.id,
          amount: formatAmount(event.amount_cents, event.currency),
          date: formatDate(event.created_at),
          type: event.event_type,
        },
      });

      if (error) throw error;
      toast.success("Invoice sent to your email");
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice");
    } finally {
      setEmailingSending(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Billing History</h1>
            <p className="text-muted-foreground">
              View all your subscription and trial credit transactions
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Complete record of all billing events and subscription changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No billing history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{formatDate(event.created_at)}</TableCell>
                        <TableCell>{getEventTypeBadge(event.event_type)}</TableCell>
                        <TableCell className="font-medium">
                          {event.amount_cents > 0
                            ? formatAmount(event.amount_cents, event.currency)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={event.status === 'completed' ? 'default' : 'secondary'}>
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {event.amount_cents > 0 && event.status === 'completed' && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadInvoice(event)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => emailInvoice(event)}
                                disabled={emailingSending === event.id}
                              >
                                {emailingSending === event.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Mail className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
