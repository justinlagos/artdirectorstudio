import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refetch } = useCredits();
  const [verifying, setVerifying] = useState(true);
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId },
        });

        if (error) throw error;

        setCreditsAdded(data.credits_added);
        await refetch();
        toast.success(`${data.credits_added} credits added to your account!`);
      } catch (error) {
        console.error('Error verifying payment:', error);
        toast.error('Payment verification failed. Please contact support.');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, refetch]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            {creditsAdded ? `${creditsAdded} credits have been added to your account` : 'Your credits have been added to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionId && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Transaction ID</p>
              <p className="text-sm font-mono break-all">{sessionId}</p>
            </div>
          )}
          <p className="text-sm text-center text-muted-foreground">
            Thank you for your purchase! Your credits are now available for use.
          </p>
          <Button 
            onClick={() => navigate("/")} 
            className="w-full gap-2"
          >
            <Home className="w-4 h-4" />
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
