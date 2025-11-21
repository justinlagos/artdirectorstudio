import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function PresetGallery() {
  const navigate = useNavigate();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-12 pb-20 md:pb-12 max-w-4xl">
          <Card className="glass-strong">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/30 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">Presets Temporarily Unavailable</h2>
              <p className="text-lg text-muted-foreground mb-6 max-w-md mx-auto">
                This feature is paused while we rebuild it with a better experience. Check back soon!
              </p>
              <Button 
                onClick={() => navigate("/")}
                size="lg"
                className="min-w-[180px]"
              >
                Go to Studio
              </Button>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>
    </ErrorBoundary>
  );
}
