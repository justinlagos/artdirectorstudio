import { UserMenu } from "./UserMenu";
import { CreditBalance } from "./CreditBalance";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { Blend, Maximize2, Layers, BarChart3, Images, Home } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageBlendDialog } from "./ImageBlendDialog";
import { ImageUpscaleDialog } from "./ImageUpscaleDialog";
import { BatchProcessDialog } from "./BatchProcessDialog";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showBlendDialog, setShowBlendDialog] = useState(false);
  const [showUpscaleDialog, setShowUpscaleDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  
  return (
    <>
      <header className="sticky top-0 z-50 glass-strong border-b border-border/50 transition-all duration-300">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <button 
                onClick={() => navigate("/")}
                className="flex items-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <span className="text-primary-foreground font-bold text-sm">AD</span>
                </div>
                <span className="hidden sm:inline font-display font-semibold text-lg tracking-tight">
                  ArtDirector
                </span>
              </button>

              {user && (
                <nav className="hidden md:flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/")}
                    className="h-9"
                  >
                    <Home className="w-4 h-4 mr-1.5" />
                    Studio
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/gallery")}
                    className="h-9"
                  >
                    <Images className="w-4 h-4 mr-1.5" />
                    Gallery
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/analytics")}
                    className="h-9"
                  >
                    <BarChart3 className="w-4 h-4 mr-1.5" />
                    Analytics
                  </Button>
                  <div className="w-px h-5 bg-border mx-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBlendDialog(true)}
                    className="h-9"
                  >
                    <Blend className="w-4 h-4 mr-1.5" />
                    Blend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpscaleDialog(true)}
                    className="h-9"
                  >
                    <Maximize2 className="w-4 h-4 mr-1.5" />
                    Upscale
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBatchDialog(true)}
                    className="h-9"
                  >
                    <Layers className="w-4 h-4 mr-1.5" />
                    Batch
                  </Button>
                </nav>
              )}
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {user && <CreditBalance />}
              <UserMenu />
            </div>
          </div>
        </div>

        {/* Hero section - only show on home page */}
        {window.location.pathname === "/" && (
          <div className="border-t border-border/30">
            <div className="container mx-auto px-4 max-w-7xl py-12 text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-4 tracking-tight">
                <span className="gradient-text">ArtDirector Studio</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Reconstruct. Refine. Reimagine.
              </p>
            </div>
          </div>
        )}
      </header>

      <ImageBlendDialog open={showBlendDialog} onOpenChange={setShowBlendDialog} />
      <ImageUpscaleDialog open={showUpscaleDialog} onOpenChange={setShowUpscaleDialog} />
      <BatchProcessDialog open={showBatchDialog} onOpenChange={setShowBatchDialog} />
    </>
  );
};
