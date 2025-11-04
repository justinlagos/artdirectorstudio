import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LAYOUT, PADDING, GRID } from "@/lib/utils/layoutConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles, Wand2, TrendingUp, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet";

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar_url?: string;
}

const Beta = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  // Redirect logic for beta page
  useEffect(() => {
    // If user is authenticated, always go to studio
    if (user) {
      navigate("/studio");
      return;
    }

    // If beta entry is complete and no invite code, redirect to main landing
    const betaEntryComplete = localStorage.getItem("beta_entry_complete");
    const inviteCode = searchParams.get("invite");
    
    if (betaEntryComplete === "true" && !inviteCode) {
      navigate("/");
    }
  }, [user, navigate, searchParams]);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("featured", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      if (data) setTestimonials(data);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !consent) {
      toast.error("Please provide your email and accept the terms");
      return;
    }

    setLoading(true);

    try {
      // Call edge function to handle signup + email
      const { data, error } = await supabase.functions.invoke("waitlist-signup", {
        body: { email, name, consent },
      });

      if (error) throw error;

      // Track funnel metric
      await supabase.from("funnel_metrics").insert({
        event_type: "signup",
        email,
        metadata: { source: "beta_landing" },
      });

      setSubmitted(true);
      toast.success("You're on the list! Check your email for confirmation.");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to join waitlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
        <div className="max-w-lg text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold">
            You're In! 🎉
          </h1>
          <p className="text-lg text-muted-foreground">
            Check your inbox for a confirmation email. We'll send you beta access soon.
          </p>
          <div className="pt-6">
            <Button onClick={() => navigate("/inspire")} size="lg" className="gap-2">
              Explore the Gallery
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* SEO: noindex for beta page */}
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center justify-between">
            <button
              onClick={() => {
                navigate("/");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <Sparkles className="h-6 w-6 transition-all duration-300 stroke-foreground group-hover:stroke-transparent group-hover:fill-primary" />
              <span className="text-xl font-display font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent transition-all duration-300 group-hover:from-primary group-hover:via-primary group-hover:to-primary/60">
                ArtDirector Studio
              </span>
              <Badge variant="secondary" className="ml-2 text-xs">Beta</Badge>
            </button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className={`container mx-auto ${PADDING.responsive} py-12 sm:py-20`}>
        <div className={`${LAYOUT.contentWide} mx-auto text-center ${PADDING.sectionInner} animate-fade-in`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Beta Access • Limited Spots</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-bold tracking-tight">
            Join the <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Beta Program</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Get exclusive early access to ArtDirector Studio and shape the future of creative intelligence
          </p>

          {/* Waitlist Form */}
          <Card className="max-w-xl mx-auto glass-strong">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="min-h-[48px] text-base"
                  />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="min-h-[48px] text-base"
                  />
                </div>

                <div className="flex items-start gap-3 text-left">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked as boolean)}
                    className="mt-1"
                  />
                  <label
                    htmlFor="consent"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    I agree to receive beta access emails and occasional updates about ArtDirector Studio
                  </label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="w-full min-h-[52px] text-base font-semibold gap-2"
                >
                  {loading ? "Joining..." : "Join the Beta"}
                  <Wand2 className="w-5 h-5" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12">
            <Card className="glass text-left">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Analyze Anything</h3>
                <p className="text-sm text-muted-foreground">
                  Upload images and get professional art direction breakdowns instantly
                </p>
              </CardContent>
            </Card>

            <Card className="glass text-left">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wand2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Generate Variations</h3>
                <p className="text-sm text-muted-foreground">
                  Tweak prompts and create new visuals with AI guidance
                </p>
              </CardContent>
            </Card>

            <Card className="glass text-left">
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Remix & Learn</h3>
                <p className="text-sm text-muted-foreground">
                  Explore curated examples and understand what makes them work
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Testimonials Section */}
        {testimonials.length > 0 && (
          <div className={`${LAYOUT.gallery} mx-auto pt-20 sm:pt-32`}>
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl sm:text-5xl font-display font-bold">
                Early Creators Love It
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join creators who are already leveling up their design skills
              </p>
            </div>

            <div className="relative">
              {/* Gradient fade edges */}
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
              
              <div className="overflow-x-auto pb-6 scrollbar-hide">
                <div className="flex gap-6 px-4 md:px-8 min-w-max">
                  {testimonials.map((testimonial, index) => (
                    <div 
                      key={index}
                      className="group relative w-[380px] flex-shrink-0"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <Card className="relative h-full glass-strong border-border/50 hover:border-primary/30 transition-all duration-300">
                        <CardContent className="p-8 space-y-6">
                          <div className="flex items-start gap-4">
                            {testimonial.avatar_url ? (
                              <img 
                                src={testimonial.avatar_url} 
                                alt={testimonial.name}
                                className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold ring-2 ring-border">
                                {testimonial.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-lg">{testimonial.name}</p>
                              <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                            </div>
                          </div>
                          <p className="text-muted-foreground leading-relaxed text-base">
                            "{testimonial.content}"
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <style>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
          </div>
        )}

        {/* Final CTA */}
        <div className="max-w-2xl mx-auto text-center pt-20 sm:pt-32 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-display font-bold">
            Ready to level up?
          </h2>
          <p className="text-lg text-muted-foreground">
            Join the beta and we'll email you the link.
          </p>
          <Button
            size="lg"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="gap-2 min-h-[52px] px-8"
          >
            Get Beta Access
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 sm:px-6 py-12 border-t border-border/50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2025 ArtDirector Studio. All rights reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">
              Privacy
            </button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">
              Terms
            </button>
            <button onClick={() => navigate("/inspire")} className="hover:text-foreground transition-colors">
              Gallery
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Beta;
