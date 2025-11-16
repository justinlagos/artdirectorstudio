import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Receipt, FileText, Download, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createPDF } from "@/lib/pdfUtils";

interface Payment {
  id: string;
  created_at: string;
  amount_cents: number;
  currency: string;
  status: string;
  package_name: string | null;
  credits_purchased: number;
  stripe_payment_intent: string | null;
  completed_at: string | null;
}

const SubscriptionHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth", { 
        state: { message: "Please sign in to view your subscription history." }
      });
      return;
    }

    const fetchPayments = async () => {
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      } catch (error) {
        console.error("Error fetching payment history:", error);
        toast.error("Failed to load payment history");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user, navigate]);

  const formatAmount = (amountCents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, "default" | "outline" | "secondary"> = {
      completed: "default",
      pending: "secondary",
      failed: "outline",
    };

    return (
      <Badge variant={statusColors[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const downloadInvoice = async (payment: Payment) => {
    try {
      const doc = await createPDF();
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor(59, 130, 246); // Primary color
      doc.text("INVOICE", 20, 20);
      
      // Invoice details
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Invoice #: ${payment.id.substring(0, 8).toUpperCase()}`, 20, 35);
      doc.text(`Date: ${formatDate(payment.created_at)}`, 20, 42);
      doc.text(`Status: ${payment.status.toUpperCase()}`, 20, 49);
      
      // Divider line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 55, 190, 55);
      
      // Bill to
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Bill To:", 20, 65);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(user?.email || "Customer", 20, 72);
      
      // Transaction details
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Transaction Details", 20, 90);
      
      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(20, 95, 170, 10, "F");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Description", 25, 102);
      doc.text("Credits", 110, 102);
      doc.text("Amount", 150, 102);
      
      // Table row
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const description = payment.package_name || "Credit Purchase";
      doc.text(description, 25, 112);
      doc.text(payment.credits_purchased.toString(), 110, 112);
      doc.text(formatAmount(payment.amount_cents, payment.currency), 150, 112);
      
      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 118, 190, 118);
      
      // Total
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Total:", 130, 130);
      doc.setFontSize(14);
      doc.text(formatAmount(payment.amount_cents, payment.currency), 150, 130);
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for your business!", 20, 270);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 275);
      
      // Payment details
      if (payment.stripe_payment_intent) {
        doc.text(`Payment ID: ${payment.stripe_payment_intent}`, 20, 280);
      }
      
      // Save PDF
      doc.save(`invoice-${payment.id.substring(0, 8)}.pdf`);
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    }
  };

  const emailInvoice = async (payment: Payment) => {
    try {
      setSendingEmail(payment.id);
      
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: { paymentId: payment.id },
      });

      if (error) throw error;

      toast.success(`Invoice emailed to ${user?.email}`);
    } catch (error) {
      console.error("Error emailing invoice:", error);
      toast.error("Failed to send invoice email");
    } finally {
      setSendingEmail(null);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Billing History</h1>
          </div>
          <p className="text-muted-foreground">
            View all your past transactions and invoices
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              All your billing transactions and credit purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {formatDate(payment.created_at)}
                        </TableCell>
                        <TableCell>
                          {payment.package_name || "Credit Purchase"}
                        </TableCell>
                        <TableCell>{payment.credits_purchased}</TableCell>
                        <TableCell>
                          {formatAmount(payment.amount_cents, payment.currency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadInvoice(payment)}
                              disabled={payment.status !== "completed"}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => emailInvoice(payment)}
                              disabled={payment.status !== "completed" || sendingEmail === payment.id}
                              title="Email invoice"
                            >
                              {sendingEmail === payment.id ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default SubscriptionHistory;
