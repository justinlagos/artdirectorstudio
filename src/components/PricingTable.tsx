import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { toast } from "sonner";

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
  const handlePurchase = (packageName: string, credits: number) => {
    // TODO: Integrate with actual payment processor (Stripe)
    toast.info(`Payment integration coming soon! You selected ${packageName} (${credits} credits)`);
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
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
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
            >
              Purchase {pkg.name}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
