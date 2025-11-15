import { useNavigate } from "react-router-dom";
import { Sparkles, FileText, Layers, Maximize2, Wrench, Building2, Twitter, Github, Linkedin } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useToolsModal } from "@/contexts/ToolsModalContext";

export const Footer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openTool } = useToolsModal();

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
    <footer className="mt-auto border-t border-border/40 bg-gradient-to-b from-background via-background/95 to-background">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12">
          {/* Platform */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-6 w-6 text-primary" />
              <h3 className="font-display font-bold text-xl tracking-tight">ArtDirector Studio</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              AI-powered creative platform for image analysis, generation, and enhancement. Transform your creative workflow.
            </p>
            <nav className="flex flex-col space-y-2.5 pt-2">
              <a 
                href="/#hero" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] flex items-center font-medium"
              >
                Studio
              </a>
              <button 
                onClick={() => handleNavigation('/inspire')} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] flex items-center text-left w-full font-medium"
              >
                Inspire
              </button>
            </nav>
          </div>

          {/* Tools - Only show for logged-in users */}
          {user && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <Wrench className="h-5 w-5 text-primary" />
                <h3 className="font-display font-semibold text-base tracking-tight">Tools</h3>
              </div>
              <nav className="flex flex-col space-y-2.5">
                <Button 
                  variant="ghost" 
                  onClick={() => openTool('blend')}
                  className="justify-start text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] h-auto p-0 gap-2.5 font-medium"
                >
                  <Layers className="h-4 w-4" />
                  Blend
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => openTool('upscale')}
                  className="justify-start text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] h-auto p-0 gap-2.5 font-medium"
                >
                  <Maximize2 className="h-4 w-4" />
                  Upscale
                </Button>
              </nav>
            </div>
          )}

          {/* Company */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold text-base tracking-tight">Company</h3>
            </div>
            <nav className="flex flex-col space-y-2.5">
              <button 
                onClick={() => handleNavigation('/contact')} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] flex items-center text-left w-full font-medium"
              >
                Contact
              </button>
              <button 
                onClick={() => handleNavigation('/help')} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] flex items-center text-left w-full font-medium"
              >
                Help Center
              </button>
              <button
                onClick={() => {
                  const artieButton = document.querySelector('[aria-label="Chat with Artie"]') as HTMLButtonElement;
                  if (artieButton) {
                    artieButton.click();
                  } else {
                    toast.info("Opening Artie Assistant...");
                  }
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] flex items-center text-left w-full font-medium"
              >
                Artie Assistant
              </button>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold text-base tracking-tight">Legal</h3>
            </div>
            <nav className="flex flex-col space-y-2.5">
              <button 
                onClick={() => handleNavigation('/terms')} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] flex items-center text-left w-full font-medium"
              >
                Terms & Conditions
              </button>
              <button 
                onClick={() => handleNavigation('/privacy')} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] flex items-center text-left w-full font-medium"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => handleNavigation('/cookies')} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] flex items-center text-left w-full font-medium"
              >
                Cookie Policy
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 md:mt-16 pt-8 border-t border-border/40">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} ArtDirector Studio. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <p className="text-sm text-muted-foreground hidden sm:block">
                Built with AI precision
              </p>
              <div className="flex items-center gap-4">
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
