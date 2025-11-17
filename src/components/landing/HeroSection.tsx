import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { useState, useEffect } from "react";

interface HeroSectionProps {
  user: any;
}

export const HeroSection = ({ user }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section 
      className="relative min-h-[85vh] md:min-h-[90vh] flex items-center justify-center px-6 lg:px-8 pt-24 pb-16 md:pb-24 overflow-hidden"
      aria-label="Hero section"
    >
      <div className="max-w-7xl mx-auto w-full text-center space-y-10 md:space-y-12">
        {/* Main Header */}
        <div 
          className={`space-y-6 md:space-y-8 transition-all duration-1000 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] text-foreground max-w-5xl mx-auto">
            Turn ideas into visuals with the clarity of a world-class creative partner.
          </h1>
          
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-normal">
            Your art director, visual brainstormer, and concept engine in one place.
            <br className="hidden md:block" />
            <span className="block mt-2 md:mt-0 md:inline">Built for designers who move fast and think big.</span>
          </p>
        </div>

        {/* CTAs */}
        {!user && (
          <div 
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 transition-all duration-1000 delay-200 ease-out ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Button 
              size="lg" 
              className="text-base md:text-lg px-8 md:px-10 py-6 md:py-7 h-auto font-medium rounded-lg shadow-subtle hover:shadow-medium transition-all duration-300 hover:scale-[1.02]"
              onClick={() => navigate("/auth")}
            >
              Start creating
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="text-base md:text-lg px-8 md:px-10 py-6 md:py-7 h-auto font-medium rounded-lg border-2 hover:bg-accent transition-all duration-300 hover:scale-[1.02]"
              onClick={() => {
                const showcase = document.getElementById("showcase-section");
                showcase?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <Play className="w-5 h-5 mr-2" />
              See examples
            </Button>
          </div>
        )}

        {/* Hero Visual - Studio Mockup Placeholder */}
        <div 
          className={`mt-12 md:mt-16 lg:mt-20 transition-all duration-1000 delay-300 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <div className="relative max-w-6xl mx-auto">
            {/* Studio Interface Mockup */}
            <div className="relative bg-gradient-to-br from-background via-surface-1 to-background rounded-xl md:rounded-2xl border border-border/50 shadow-strong overflow-hidden">
              <div className="aspect-video bg-muted/30 flex items-center justify-center p-8 md:p-16">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg 
                      className="w-8 h-8 md:w-10 md:h-10 text-primary" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground font-medium">
                    Studio Interface
                  </p>
                </div>
              </div>
            </div>

            {/* Floating UI Elements */}
            <div className="absolute -top-4 -right-4 md:-top-6 md:-right-6 w-12 h-12 md:w-16 md:h-16 bg-background rounded-lg border border-border/50 shadow-medium flex items-center justify-center animate-float">
              <svg className="w-6 h-6 md:w-8 md:h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
              </svg>
            </div>
            
            <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 w-12 h-12 md:w-16 md:h-16 bg-background rounded-lg border border-border/50 shadow-medium flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
              <svg className="w-6 h-6 md:w-8 md:h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

