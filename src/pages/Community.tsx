import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const Community = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-1">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-16 max-w-5xl">
        <div className="space-y-8 text-center">
          <div className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-bold">Community</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The Inspire gallery has been retired while we refresh our community experience.
              Stay in Studio to keep creating or share your work directly with others.
            </p>
          </div>

          <Card className="glass">
            <CardContent className="p-8 space-y-4">
              <h2 className="text-2xl font-semibold">What&apos;s next?</h2>
              <p className="text-muted-foreground">
                Keep exploring the Studio for analysis, generation, editing, and uploads. When you&apos;re ready to
                collaborate, you can still share links to your creations externally while we build the next iteration
                of our community tools.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button asChild>
                  <Link to="/">Back to Studio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Community;
