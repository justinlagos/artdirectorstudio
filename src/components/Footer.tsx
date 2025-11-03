import { useNavigate } from "react-router-dom";
import { Sparkles, FileText, HelpCircle, Layers, Maximize2, ImageIcon, Wrench } from "lucide-react";
import { ToolDialog } from "./ToolDialog";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { ImageBlendDialogEnhanced } from "./ImageBlendDialogEnhanced";
import { ImageUpscaleDialog } from "./ImageUpscaleDialog";
import { BatchProcessDialog } from "./BatchProcessDialog";

export const Footer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isBlendDialogOpen, setIsBlendDialogOpen] = useState(false);
  const [isUpscaleDialogOpen, setIsUpscaleDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(targetId);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };
  return (
    <footer className="mt-auto border-t border-border/40 bg-gradient-to-b from-background via-surface-1/50 to-surface-2">
      <div className="container py-8 md:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Platform */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-display font-semibold text-lg">ArtDirector Studio</h3>
            </div>
            <nav className="flex flex-col space-y-3">
              <a href="/#hero" className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                Studio
              </a>
              <button onClick={() => handleNavigation('/inspire')} className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center text-left w-full">
                Inspire
              </button>
              <button onClick={() => handleNavigation('/analytics')} className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center text-left w-full">
                Analytics
              </button>
            </nav>
          </div>

          {/* Tools - Only show for logged-in users */}
          {user && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <Wrench className="h-5 w-5" />
                <h3 className="font-display font-semibold text-lg">Tools</h3>
              </div>
              <nav className="flex flex-col space-y-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsBlendDialogOpen(true)}
                  className="justify-start text-muted-foreground hover:text-foreground transition-colors min-h-[44px] h-auto p-0 gap-2"
                >
                  <Layers className="h-4 w-4" />
                  Blend
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsUpscaleDialogOpen(true)}
                  className="justify-start text-muted-foreground hover:text-foreground transition-colors min-h-[44px] h-auto p-0 gap-2"
                >
                  <Maximize2 className="h-4 w-4" />
                  Upscale
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsBatchDialogOpen(true)}
                  className="justify-start text-muted-foreground hover:text-foreground transition-colors min-h-[44px] h-auto p-0 gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Batch
                </Button>
              </nav>
            </div>
          )}

          {/* Legal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5" />
              <h3 className="font-display font-semibold text-lg">Legal</h3>
            </div>
            <nav className="flex flex-col space-y-3">
              <button onClick={() => handleNavigation('/terms')} className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center text-left w-full">
                Terms & Conditions
              </button>
              <button onClick={() => handleNavigation('/privacy')} className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center text-left w-full">
                Privacy Policy
              </button>
              <button onClick={() => handleNavigation('/cookies')} className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center text-left w-full">
                Cookie Policy
              </button>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="h-5 w-5" />
              <h3 className="font-display font-semibold text-lg">Support</h3>
            </div>
            <nav className="flex flex-col space-y-3">
              <button onClick={() => handleNavigation('/contact')} className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center text-left w-full">
                Contact
              </button>
              <button onClick={() => handleNavigation('/help')} className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center text-left w-full">
                Help Center
              </button>
              <button
                onClick={() => {
                  // In real implementation, this would open the Artie panel
                  toast.info("Opening Artie Assistant...");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center text-left"
              >
                Artie Assistant
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 md:mt-10 pt-6 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ArtDirector Studio. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
          Built with AI precision.
        </p>
      </div>
    </div>
    
    {/* Tool Dialogs */}
    <ImageBlendDialogEnhanced open={isBlendDialogOpen} onOpenChange={setIsBlendDialogOpen} />
    <ImageUpscaleDialog open={isUpscaleDialogOpen} onOpenChange={setIsUpscaleDialogOpen} />
    <BatchProcessDialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen} />
  </footer>
  );
};
