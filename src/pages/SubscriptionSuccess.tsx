import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { subscription, refetch } = useSubscription();

  useEffect(() => {
    refetch();
    toast.success("Welcome to ArtDirector Studio Pro! You now have unlimited creative access.");
  }, [refetch]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-500" />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Subscription Active!
          </CardTitle>
          <CardDescription>
            You're now a {subscription.tier} member
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">What's Unlocked:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Unlimited image analysis</li>
              <li>• Unlimited image generation</li>
              <li>• Advanced blending & upscaling</li>
              <li>• Batch processing</li>
              <li>• Priority support</li>
            </ul>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Start creating with no limits. All tools are now available.
          </p>
          <Button 
            onClick={() => navigate("/")} 
            className="w-full gap-2"
            size="lg"
          >
            <Home className="w-4 h-4" />
            Start Creating
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
