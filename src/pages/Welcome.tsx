import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Footer";

export default function Welcome() {
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
    // Logo always goes to welcome page when signed out
    navigate("/welcome");
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
            <Button
              variant="outline"
              onClick={() => handleNavigation("/auth")}
              className="ml-4"
            >
              Sign In
            </Button>
          </nav>

          <Button
            variant="outline"
            onClick={() => handleNavigation("/auth")}
            className="md:hidden"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-4xl mx-auto text-center space-y-12 animate-fade-in">
          {/* Hero Section */}
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-surface-2 border border-border/50 animate-scale-in">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-surface-3 to-muted flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-foreground" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-semibold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent animate-slide-down">
                Signed out successfully
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up">
                Your creative journey continues here
              </p>
            </div>
          </div>

          {/* CTA Cards */}
          <div className="grid md:grid-cols-3 gap-6 pt-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {/* Explore Inspire */}
            <button
              onClick={() => handleNavigation("/inspire")}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 text-left transition-all duration-300 hover:shadow-strong hover:-translate-y-1 hover:border-foreground/20"
            >
              <div className="relative z-10 space-y-4">
                <div className="inline-flex p-3 rounded-xl bg-surface-2 border border-border/30 transition-all duration-300 group-hover:bg-surface-3 group-hover:scale-110">
                  <Sparkles className="w-6 h-6 text-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-semibold">
                    Explore Inspire
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Discover stunning creations from the community
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>

            {/* Explore Community */}
            <button
              onClick={() => handleNavigation("/contact")}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 text-left transition-all duration-300 hover:shadow-strong hover:-translate-y-1 hover:border-foreground/20"
            >
              <div className="relative z-10 space-y-4">
                <div className="inline-flex p-3 rounded-xl bg-surface-2 border border-border/30 transition-all duration-300 group-hover:bg-surface-3 group-hover:scale-110">
                  <Users className="w-6 h-6 text-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-semibold">
                    Get in Touch
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Questions? Feedback? We'd love to hear from you
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>

            {/* Sign Back In */}
            <button
              onClick={() => handleNavigation("/auth")}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 text-left transition-all duration-300 hover:shadow-strong hover:-translate-y-1 hover:border-foreground/20"
            >
              <div className="relative z-10 space-y-4">
                <div className="inline-flex p-3 rounded-xl bg-surface-2 border border-border/30 transition-all duration-300 group-hover:bg-surface-3 group-hover:scale-110">
                  <LogIn className="w-6 h-6 text-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-semibold">
                    Sign Back In
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Continue where you left off
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>

          {/* Subtle ambient decoration */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tl from-foreground/5 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
