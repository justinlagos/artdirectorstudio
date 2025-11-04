import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Wand2, TrendingUp, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar_url?: string;
}

const Beta = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

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
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <span className="text-2xl font-display font-bold">TryArtie</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="gap-2"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Beta Access • Limited Spots</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-bold tracking-tight">
            Learn and create
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              at the same time
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upload any image, get an art-director level breakdown, tweak the brief, 
            and generate new visuals instantly. Remix examples from Inspire or start fresh.
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
                    I agree to receive beta access emails and occasional updates about TryArtie
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
          <div className="max-w-6xl mx-auto pt-20 sm:pt-32">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                Early Creators Love It
              </h2>
              <p className="text-lg text-muted-foreground">
                Join creators who are already leveling up their design skills
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="glass-strong">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      "{testimonial.content}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
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
          <p>© 2025 TryArtie. All rights reserved.</p>
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
