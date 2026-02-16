import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Zap, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseEdgeFunctionError } from "@/lib/edgeFunctionErrors";

const plans = [
  {
    name: "Starter",
    price: "$3",
    priceId: "price_1SQqaNBOqYfTntNB5NF0eqFr",
    productId: "prod_TNbnpk8TQPKkOI",
    description: "Perfect for casual creators",
    features: [
      "10 generations per day",
      "Basic image analysis",
      "Standard quality outputs",
      "Community support",
    ],
    limit: "10/day",
  },
  {
    name: "Pro",
    price: "$10",
    priceId: "price_1SQqbLBOqYfTntNBjhHl91uA",
    productId: "prod_TNboMvg65fjVIr",
    description: "For creators who need unlimited power",
    features: [
      "Unlimited AI generations",
      "Advanced image analysis",
      "All tools unlocked",
      "High quality outputs",
      "Priority support",
    ],
    limit: "Unlimited",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$25",
    priceId: "price_1SQqblBOqYfTntNBDB0wrK6Q",
    productId: "prod_TNbpDSX3jWb5GH",
    description: "For agencies and power users",
    features: [
      "Unlimited AI generations",
      "Premium AI models",
      "API access",
      "Dedicated support",
      "Custom integrations",
      "Team collaboration",
    ],
    limit: "Unlimited + API",
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
    } catch (error: unknown) {
      console.error('Error creating subscription checkout:', error);
      const parsed = await parseEdgeFunctionError(error);
      const errorMessage =
        parsed.message && parsed.message !== "Edge Function returned a non-2xx status code"
          ? parsed.message
          : 'Failed to create checkout session. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
      {plans.map((plan) => (
        <Card key={plan.name} className={`flex flex-col relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                Most Popular
              </span>
            </div>
          )}
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {plan.name}
              <Crown className="w-5 h-5 text-primary" />
            </CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="mb-6">
              <p className="text-4xl font-bold">
                {plan.price}
                <span className="text-lg text-muted-foreground">/mo</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.limit}
              </p>
            </div>
            <ul className="space-y-3">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => handleSubscribe(plan.name, plan.priceId)}
              disabled={loading === plan.name}
              className="w-full"
              variant={plan.popular ? "default" : "outline"}
            >
              {loading === plan.name ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Subscribe
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
