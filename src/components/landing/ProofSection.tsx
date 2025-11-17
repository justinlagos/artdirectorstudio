import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Quote } from "lucide-react";

export const ProofSection = () => {
  const { data: testimonials } = useQuery({
    queryKey: ["testimonials", "proof"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("featured", true)
        .order("display_order", { ascending: true })
        .limit(3);
      return data;
    },
  });

  // Fallback quotes if no testimonials from DB
  const defaultQuotes = [
    "Feels like having a senior creative director on call.",
    "The fastest way to get my ideas visual.",
    "This replaced hours of brainstorming.",
  ];

  const quotes = testimonials && testimonials.length > 0
    ? testimonials.map((t: any) => t.content)
    : defaultQuotes;

  return (
    <section 
      className="py-20 md:py-28 px-6 lg:px-8 bg-surface-1"
      aria-label="Social validation"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Creators are already building faster, thinking clearer, and delivering better work.
          </h2>
        </div>

        {/* Quotes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {quotes.map((quote, index) => (
            <div
              key={index}
              className="relative bg-card border border-border/50 rounded-xl md:rounded-2xl p-8 md:p-10 hover:shadow-medium transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="space-y-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Quote className="w-5 h-5 text-primary" />
                </div>
                <p className="text-lg md:text-xl text-foreground leading-relaxed font-medium italic">
                  "{quote}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

