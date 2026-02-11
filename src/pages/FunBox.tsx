import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { FUN_LAB_TOOLS } from "@/components/landing/FunLabSection";

const FunBox = () => {
  const navigate = useNavigate();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1">
          <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium uppercase tracking-wide text-primary">
                  Fun Box
                </span>
              </div>

              <div className="space-y-3 mb-8">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight">
                  Playful tools for fast experiments
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
                  Jump straight into Art Director Studio&apos;s most playful utilities —
                  from caricatures and background removal to upscaling and visual analysis.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10">
                {FUN_LAB_TOOLS.map((tool) => (
                  <Card
                    key={tool.id}
                    className="group relative p-5 h-full cursor-pointer border-border/60 hover:border-primary/40 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-background to-background/95"
                    onClick={() => navigate(tool.route)}
                  >
                    {tool.badge && (
                      <div className="absolute top-4 right-4 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        {tool.badge}
                      </div>
                    )}

                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                      {tool.icon}
                    </div>

                    <div className="space-y-1.5">
                      <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {tool.name}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {tool.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center text-xs font-medium text-primary/90 group-hover:text-primary">
                      <span>Open {tool.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground max-w-xl">
                  Tip: use Fun Box tools to prototype looks, then bring your favorite results
                  back into the main Studio for deeper analysis and campaign development.
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => navigate("/")}
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  Back to Studio
                </Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default FunBox;

