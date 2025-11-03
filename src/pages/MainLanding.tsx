import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Lightbulb, Users, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function MainLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is authenticated, redirect to studio
  useEffect(() => {
    if (user) {
      navigate("/studio");
    }
  }, [user, navigate]);

  const handleNavigation = (path: string) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogoClick = () => {
    navigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-6">
          <button
            onClick={handleLogoClick}
            className="flex items-center space-x-2 group"
          >
            <Sparkles className="h-6 w-6 transition-all duration-300 stroke-foreground group-hover:stroke-transparent group-hover:fill-primary" />
            <div className="text-xl font-display font-semibold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent transition-all duration-300 group-hover:from-primary group-hover:via-primary group-hover:to-primary/60">
              ArtDirector Studio
            </div>
          </button>

          <nav className="hidden md:flex items-center space-x-1">
            <Button
              variant="ghost"
              onClick={() => handleNavigation("/inspire")}
              className="text-sm font-medium transition-all duration-250"
            >
              Inspire
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleNavigation("/help")}
              className="text-sm font-medium transition-all duration-250"
            >
              Learn
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleNavigation("/contact")}
              className="text-sm font-medium transition-all duration-250"
            >
              Contact
            </Button>
            <ThemeToggle />
            <Button
              onClick={() => handleNavigation("/auth")}
              className="ml-4"
            >
              Sign In
            </Button>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Button
              onClick={() => handleNavigation("/auth")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container px-6 py-24 md:py-32 lg:py-40">
          <div className="max-w-5xl mx-auto text-center space-y-12 animate-fade-in">
            {/* Icon */}
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-surface-2 border border-border/50 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-surface-3 to-muted flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-foreground" />
              </div>
            </div>

            {/* Hero Text */}
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-semibold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent animate-slide-down">
                Reconstruct. Refine. Reimagine.
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-slide-up">
                Transform your creative vision with intelligent image analysis and regeneration powered by advanced AI
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Button
                size="lg"
                onClick={() => handleNavigation("/auth")}
                className="min-w-[200px] text-base h-12"
              >
                <Wand2 className="w-5 h-5 mr-2" />
                Start Creating
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleNavigation("/inspire")}
                className="min-w-[200px] text-base h-12"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Explore Inspire
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container px-6 py-24 border-t border-border/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">
                Built for Creative Professionals
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Every tool designed to enhance your workflow and expand your creative possibilities
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 transition-all duration-300 hover:shadow-strong hover:-translate-y-1 hover:border-foreground/20">
                <div className="space-y-4">
                  <div className="inline-flex p-3 rounded-xl bg-surface-2 border border-border/30 transition-all duration-300 group-hover:bg-surface-3 group-hover:scale-110">
                    <Sparkles className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-display font-semibold">
                      Intelligent Analysis
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Deep visual understanding that captures composition, lighting, mood, and style with precision
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Feature 2 */}
              <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 transition-all duration-300 hover:shadow-strong hover:-translate-y-1 hover:border-foreground/20">
                <div className="space-y-4">
                  <div className="inline-flex p-3 rounded-xl bg-surface-2 border border-border/30 transition-all duration-300 group-hover:bg-surface-3 group-hover:scale-110">
                    <Wand2 className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-display font-semibold">
                      Creative Regeneration
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Transform concepts into reality with context-aware generation that understands your vision
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Feature 3 */}
              <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 transition-all duration-300 hover:shadow-strong hover:-translate-y-1 hover:border-foreground/20">
                <div className="space-y-4">
                  <div className="inline-flex p-3 rounded-xl bg-surface-2 border border-border/30 transition-all duration-300 group-hover:bg-surface-3 group-hover:scale-110">
                    <Users className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-display font-semibold">
                      Share & Inspire
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Join a community of creators, showcase your work, and discover endless inspiration
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container px-6 py-24 border-t border-border/40">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">
                Ready to transform your creative process?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join thousands of creators using ArtDirector Studio to bring their visions to life
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => handleNavigation("/auth")}
                className="min-w-[200px] text-base h-12"
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleNavigation("/help")}
                className="min-w-[200px] text-base h-12"
              >
                <Lightbulb className="w-5 h-5 mr-2" />
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Subtle ambient decoration */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tl from-foreground/5 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
