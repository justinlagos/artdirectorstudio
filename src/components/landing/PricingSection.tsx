import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const PricingSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const tiers = [
    {
      name: "Free",
      description: "Enough to explore",
      features: [
        "Limited generations",
        "Basic tools access",
        "Community support",
      ],
      cta: "Get started",
      highlight: false,
    },
    {
      name: "Pro",
      description: "Full creative power",
      features: [
        "Unlimited generations",
        "All tools unlocked",
        "High-quality outputs",
        "Priority support",
      ],
      cta: "Upgrade to Pro",
      highlight: true,
    },
    {
      name: "Team",
      description: "For studios and agencies",
      features: [
        "Everything in Pro",
        "Team collaboration",
        "Advanced analytics",
        "Dedicated support",
      ],
      cta: "Contact sales",
      highlight: false,
    },
  ];

  const handleCta = (tierName: string) => {
    if (!user) {
      navigate("/auth");
    } else if (tierName === "Team") {
      navigate("/contact");
    } else {
      navigate("/subscriptions");
    }
  };

  return (
    <section 
      className="py-20 md:py-28 px-6 lg:px-8 bg-background"
      aria-label="Pricing"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Choose how you create
          </h2>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`relative bg-card border rounded-xl md:rounded-2xl p-8 md:p-10 flex flex-col ${
                tier.highlight
                  ? "border-primary shadow-medium md:scale-105"
                  : "border-border/50"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                    {tier.name}
                  </h3>
                  <p className="text-base md:text-lg text-muted-foreground">
                    {tier.description}
                  </p>
                </div>

                <ul className="space-y-4">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-base text-foreground leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-8 border-t border-border/50">
                <Button
                  onClick={() => handleCta(tier.name)}
                  className={`w-full text-base py-6 h-auto font-medium rounded-lg transition-all duration-300 hover:scale-[1.02] ${
                    tier.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-subtle"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {tier.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

