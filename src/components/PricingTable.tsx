import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseEdgeFunctionError } from "@/lib/edgeFunctionErrors";

const packages = [
  {
    name: "Starter",
    credits: 10,
    price: 5,
    description: "Perfect for trying out",
    features: ["~3 image generations", "~10 analyses", "Basic support"],
  },
  {
    name: "Pro",
    credits: 50,
    price: 20,
    description: "Best for regular users",
    popular: true,
    features: ["~16 image generations", "~50 analyses", "Priority support", "Save 20%"],
  },
  {
    name: "Business",
    credits: 100,
    price: 35,
    description: "For power users",
    features: ["~33 image generations", "~100 analyses", "Premium support", "Save 30%"],
  },
  {
    name: "Enterprise",
    credits: 500,
    price: 150,
    description: "Best value",
    features: ["~166 image generations", "~500 analyses", "Dedicated support", "Save 40%"],
  },
];

export const PricingTable = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (packageName: string, credits: number) => {
    if (!session) {
      toast.error("Please sign in to purchase credits");
      return;
    }

    setLoading(packageName);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          packageName,
          credits,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      console.error('Error creating checkout session:', error);
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-6">
      {packages.map((pkg) => (
        <Card
          key={pkg.name}
          className={`relative flex flex-col ${pkg.popular ? 'border-primary shadow-md' : ''}`}
        >
          {pkg.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
              Most Popular
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-xl">{pkg.name}</CardTitle>
            <CardDescription>{pkg.description}</CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold">${pkg.price}</span>
              <span className="text-muted-foreground ml-2">/ {pkg.credits} credits</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-3">
              {pkg.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant={pkg.popular ? "default" : "outline"}
              onClick={() => handlePurchase(pkg.name, pkg.credits)}
              disabled={loading === pkg.name}
            >
              {loading === pkg.name ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Purchase ${pkg.name}`
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
