import { Link } from "react-router-dom";
import { Sparkles, FileText, HelpCircle, Layers, Maximize2, ImageIcon, Wrench } from "lucide-react";
import { ToolDialog } from "./ToolDialog";
import { Button } from "./ui/button";
import { toast } from "sonner";

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-border/40 bg-gradient-to-b from-background via-surface-1/50 to-surface-2">
      <div className="container py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Platform */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold text-lg">ArtDirector Studio</h3>
            </div>
            <nav className="flex flex-col space-y-3">
              <a href="/#hero" className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                Studio
              </a>
              <Link to="/inspire" className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                Inspire
              </Link>
              <Link to="/analytics" className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                Analytics
              </Link>
            </nav>
          </div>

          {/* Tools */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <Wrench className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold text-lg">Tools</h3>
            </div>
            <nav className="flex flex-col space-y-3">
              <ToolDialog
                trigger={
                  <Button variant="ghost" className="justify-start text-muted-foreground hover:text-foreground transition-colors min-h-[44px] h-auto p-0 gap-2">
                    <Layers className="h-4 w-4" />
                    Blend
                  </Button>
                }
                title="Blend Images"
                description="Seamlessly combine two images with customizable blend modes"
                toolType="blend"
              />
              <ToolDialog
                trigger={
                  <Button variant="ghost" className="justify-start text-muted-foreground hover:text-foreground transition-colors min-h-[44px] h-auto p-0 gap-2">
                    <Maximize2 className="h-4 w-4" />
                    Upscale
                  </Button>
                }
                title="Upscale Image"
                description="Enhance image resolution with AI-powered upscaling"
                toolType="upscale"
              />
              <ToolDialog
                trigger={
                  <Button variant="ghost" className="justify-start text-muted-foreground hover:text-foreground transition-colors min-h-[44px] h-auto p-0 gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Batch
                  </Button>
                }
                title="Batch Processing"
                description="Process multiple images at once with consistent operations"
                toolType="batch"
              />
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold text-lg">Legal</h3>
            </div>
            <nav className="flex flex-col space-y-3">
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                Terms & Conditions
              </Link>
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                Privacy Policy
              </Link>
              <Link to="/cookies" className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                Cookie Policy
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold text-lg">Support</h3>
            </div>
            <nav className="flex flex-col space-y-3">
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                Contact
              </Link>
              <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
                Help Center
              </Link>
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
        <div className="mt-16 pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ArtDirector Studio. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built with AI precision.
          </p>
        </div>
      </div>
    </footer>
  );
};
