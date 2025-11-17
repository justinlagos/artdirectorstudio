import { Palette, Layers, Maximize2, Lightbulb, MessageSquare, History } from "lucide-react";

export const CoreFeaturesSection = () => {
  const features = [
    {
      title: "Studio",
      description: "A focused canvas for generating, refining, and improving visuals with precision.",
      icon: Palette,
    },
    {
      title: "Blend",
      description: "Combine ideas, styles, or directions into a single cohesive visual.",
      icon: Layers,
    },
    {
      title: "Upscale",
      description: "High-resolution output ready for presentations, pitches, and production.",
      icon: Maximize2,
    },
    {
      title: "Insights",
      description: "Clear, structured interpretation of your brief from a creative director's perspective.",
      icon: Lightbulb,
    },
    {
      title: "Artie Chat",
      description: "Your creative partner for brainstorming, rewriting briefs, ideation, and visual planning.",
      icon: MessageSquare,
    },
    {
      title: "History & Saved Projects",
      description: "A clean timeline of your ideas evolving into final concepts.",
      icon: History,
    },
  ];

  return (
    <section 
      className="py-20 md:py-28 px-6 lg:px-8 bg-surface-1"
      aria-label="Core features"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Your entire creative workflow, in one clean space.
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-card border border-border/50 rounded-xl md:rounded-2xl p-8 md:p-10 hover:shadow-medium transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
              >
                <div className="space-y-5">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                      {feature.description}
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

