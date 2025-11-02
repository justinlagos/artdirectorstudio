import { useNavigate } from "react-router-dom";
import { XCircle, Home, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { CreditPurchaseDialog } from "@/components/CreditPurchaseDialog";

const PaymentCancelled = () => {
  const navigate = useNavigate();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-destructive/5">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-orange-600 dark:text-orange-500" />
            </div>
            <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
            <CardDescription>
              Your payment was not processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              No charges were made to your account. You can try again or return to the home page.
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => setShowPurchaseDialog(true)}
                className="w-full gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Try Again
              </Button>
              <Button 
                onClick={() => navigate("/")} 
                variant="outline"
                className="w-full gap-2"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreditPurchaseDialog 
        open={showPurchaseDialog} 
        onOpenChange={setShowPurchaseDialog} 
      />
    </>
  );
};

export default PaymentCancelled;
