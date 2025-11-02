import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCredits } from "@/hooks/useCredits";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refetch } = useCredits();

  useEffect(() => {
    // Refetch credits to show updated balance
    refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your credits have been added to your account
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
