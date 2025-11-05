import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const plans = [
  {
    name: "Starter",
    price: 3,
    priceId: "price_starter_monthly",
    description: "Perfect for trying out",
    features: ["10 generations/day", "Basic analysis", "Email support", "Cancel anytime"],
    limit: "10/day",
  },
  {
    name: "Pro",
    price: 10,
    priceId: "price_pro_monthly",
    description: "Best for creators",
    popular: true,
    features: ["Unlimited generations", "Advanced analysis", "Priority support", "All tools unlocked"],
    limit: "Unlimited",
  },
  {
    name: "Enterprise",
    price: 25,
    priceId: "price_enterprise_monthly",
    description: "For power users",
    features: ["Unlimited everything", "Premium models", "Dedicated support", "API access"],
    limit: "Unlimited",
  },
];

export const SubscriptionPricingTable = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planName: string, priceId: string) => {
    if (!session) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setLoading(planName);

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          priceId,
          planName,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating subscription checkout:', error);
      toast.error('Failed to create checkout session. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
      {plans.map((plan) => (
        <Card 
          key={plan.name} 
          className={`relative flex flex-col transition-all duration-200 ${
            plan.popular 
              ? 'border-primary shadow-lg scale-105' 
              : 'hover:shadow-md'
          }`}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Most Popular
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-2xl">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">${plan.price}</span>
              <span className="text-muted-foreground ml-2">/ month</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {plan.limit} generations
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant={plan.popular ? "default" : "outline"}
              size="lg"
              onClick={() => handleSubscribe(plan.name, plan.priceId)}
              disabled={loading === plan.name}
            >
              {loading === plan.name ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Subscribe to ${plan.name}`
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
