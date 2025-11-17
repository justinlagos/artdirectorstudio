import { Sparkles, Clock, Heart } from "lucide-react";

export const EmotionalValueSection = () => {
  const pillars = [
    {
      title: "Instant clarity",
      description: "You drop a brief. Artie understands your direction and gives you your first visual starting point.",
      icon: Sparkles,
    },
    {
      title: "More time for real work",
      description: "You skip the repetitive thinking and jump straight into the part you enjoy creating.",
      icon: Clock,
    },
    {
      title: "A creative partner that gets your taste",
      description: "Your style, your preferences, your language. Fine-tuned to you.",
      icon: Heart,
    },
  ];

  return (
    <section 
      className="py-20 md:py-28 px-6 lg:px-8 bg-background"
      aria-label="Why creatives love it"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Create without friction. Explore without limits.
          </h2>
        </div>

        {/* Emotional Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <div
                key={index}
                className="group relative bg-card border border-border/50 rounded-xl md:rounded-2xl p-8 md:p-10 hover:shadow-medium transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
              >
                <div className="space-y-6">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">
                      {pillar.title}
                    </h3>
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

