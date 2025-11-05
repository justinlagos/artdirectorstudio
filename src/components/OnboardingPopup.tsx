import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Image, Wand2, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const OnboardingPopup = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_seen_onboarding')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Show popup if user hasn't seen it
        if (!data.has_seen_onboarding) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }
    };

    checkOnboarding();
  }, [user]);

  const handleClose = async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ has_seen_onboarding: true })
        .eq('id', user.id);

      setIsOpen(false);
    } catch (error) {
      console.error("Error updating onboarding status:", error);
      // Close anyway
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Welcome to ArtDirector Studio
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Your AI-powered creative platform for image analysis, generation, and enhancement
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
          <div className="space-y-2 text-center p-4 rounded-lg bg-muted/50">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Image className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Analyze</h3>
            <p className="text-sm text-muted-foreground">
              Upload any image to get deep AI-powered insights
            </p>
          </div>

          <div className="space-y-2 text-center p-4 rounded-lg bg-muted/50">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Create</h3>
            <p className="text-sm text-muted-foreground">
              Generate new visuals with advanced AI tools
            </p>
          </div>

          <div className="space-y-2 text-center p-4 rounded-lg bg-muted/50">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold">Enhance</h3>
            <p className="text-sm text-muted-foreground">
              Blend, upscale, and batch-process with precision
            </p>
          </div>
        </div>

        <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
          <p className="text-sm text-center">
            <strong>Pro Tip:</strong> Use keyboard shortcuts for faster workflow: 
            <span className="font-mono text-xs ml-2">Cmd/Ctrl + U</span> to upload,
            <span className="font-mono text-xs ml-2">Cmd/Ctrl + Enter</span> to analyze
          </p>
        </div>

        <Button onClick={handleClose} className="w-full" size="lg">
          Get Started
        </Button>
      </DialogContent>
    </Dialog>
  );
};
