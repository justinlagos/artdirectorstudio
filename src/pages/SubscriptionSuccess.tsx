import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const getTierContent = (tier: string) => {
  switch (tier.toLowerCase()) {
    case 'starter':
      return {
        title: 'Starter Plan Active',
        description: 'Perfect for getting started with AI art',
        features: [
          '10 generations per day',
          'Basic analysis tools',
          'Standard quality outputs',
          'Core features access',
          'Email support',
        ],
        message: 'You now have daily access to creative tools!',
      };
    case 'pro':
      return {
        title: 'Pro Plan Active',
        description: 'Full creative power unleashed',
        features: [
          'Unlimited image analysis',
          'Unlimited image generation',
          'Advanced blending & upscaling',
          'Batch processing',
          'Priority support',
        ],
        message: 'You now have unlimited creative access!',
      };
    case 'enterprise':
      return {
        title: 'Enterprise Plan Active',
        description: 'Maximum power and collaboration',
        features: [
          'Everything in Pro',
          'API access',
          'Premium AI models',
          'Team collaboration',
          'Dedicated support',
        ],
        message: 'You now have full enterprise access!',
      };
    default:
      return {
        title: 'Subscription Active',
        description: 'Your subscription is now active',
        features: ['Access to creative tools'],
        message: 'Your subscription is active!',
      };
  }
};

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { subscription, refetch } = useSubscription();
  const [hasShownToast, setHasShownToast] = useState(false);

  useEffect(() => {
    refetch();
    
    // Only show toast once per subscription activation
    const toastKey = `subscription-toast-${subscription.tier}-shown`;
    if (!hasShownToast && !localStorage.getItem(toastKey)) {
      const tierContent = getTierContent(subscription.tier || 'free');
      toast.success(`Welcome to ArtDirector Studio ${subscription.tier === 'starter' ? 'Starter' : subscription.tier === 'enterprise' ? 'Enterprise' : 'Pro'}! ${tierContent.message}`);
      localStorage.setItem(toastKey, 'true');
      setHasShownToast(true);
    }
  }, [refetch, subscription.tier, hasShownToast]);

  const content = getTierContent(subscription.tier || 'free');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-500" />
          </div>
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            {content.title}
          </CardTitle>
          <CardDescription>
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">What's Unlocked:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {content.features.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            {subscription.tier === 'starter' 
              ? 'Start creating with your daily allowance.' 
              : 'Start creating with no limits. All tools are now available.'}
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
