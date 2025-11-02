import { UserMenu } from "./UserMenu";
import { CreditBalance } from "./CreditBalance";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { Blend, Maximize2, Layers, BarChart3, Images, Sparkles, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageBlendDialog } from "./ImageBlendDialog";
import { ImageUpscaleDialog } from "./ImageUpscaleDialog";
import { BatchProcessDialog } from "./BatchProcessDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showBlendDialog, setShowBlendDialog] = useState(false);
  const [showUpscaleDialog, setShowUpscaleDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  
  return (
    <TooltipProvider delayDuration={300}>
      <header className="sticky top-0 z-50 glass-strong border-b border-border/30 transition-all duration-300">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex items-center justify-between h-14">
            {/* Brand Area */}
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 group transition-opacity hover:opacity-80"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xs group-hover:shadow-sm transition-all duration-200">
                <span className="text-primary-foreground font-bold text-xs tracking-wide">AD</span>
              </div>
              <span className="hidden sm:inline font-display font-semibold text-base tracking-tight">
                ArtDirector
              </span>
            </button>

            {/* Center Menu Area */}
            {user && (
              <nav className="hidden md:flex items-center gap-6">
                {/* Tools Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-1 text-sm font-medium tracking-wide hover:bg-accent/50 transition-all duration-200"
                    >
                      Tools
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" strokeWidth={1.5} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="w-80 p-2 glass-strong shadow-strong animate-in fade-in-0 zoom-in-95 duration-200"
                    sideOffset={8}
                  >
                    <DropdownMenuItem 
                      onClick={() => navigate("/")}
                      className="flex flex-col items-start gap-1 p-3 rounded-lg cursor-pointer transition-colors duration-150"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                        <span className="font-medium text-sm">Studio</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                        Upload and analyze images into 12 creative categories with instant AI feedback.
                      </p>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={() => setShowBlendDialog(true)}
                      className="flex flex-col items-start gap-1 p-3 rounded-lg cursor-pointer transition-colors duration-150"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Blend className="w-4 h-4" strokeWidth={1.5} />
                        <span className="font-medium text-sm">Blend</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                        Merge 2–4 images into cohesive visual compositions using AI.
                      </p>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => setShowUpscaleDialog(true)}
                      className="flex flex-col items-start gap-1 p-3 rounded-lg cursor-pointer transition-colors duration-150"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Maximize2 className="w-4 h-4" strokeWidth={1.5} />
                        <span className="font-medium text-sm">Upscale</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                        Enhance image resolution and texture fidelity up to 4K.
                      </p>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => setShowBatchDialog(true)}
                      className="flex flex-col items-start gap-1 p-3 rounded-lg cursor-pointer transition-colors duration-150"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Layers className="w-4 h-4" strokeWidth={1.5} />
                        <span className="font-medium text-sm">Batch</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                        Analyze multiple images at once with automated processing.
                      </p>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Explore */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/gallery")}
                      className="h-9 text-sm font-medium tracking-wide hover:bg-accent/50 transition-all duration-200"
                    >
                      Explore
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Discover public creations and user-submitted projects
                  </TooltipContent>
                </Tooltip>

                {/* Analytics */}
                <div className="flex items-center gap-6">
                  <div className="w-px h-4 bg-border/50" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/analytics")}
                        className="h-9 text-sm font-medium tracking-wide hover:bg-accent/50 transition-all duration-200"
                      >
                        <BarChart3 className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                        Analytics
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Track your creative activity and credit usage
                    </TooltipContent>
                  </Tooltip>
                </div>
              </nav>
            )}

            {/* Right Area - Account & Credits */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user && <CreditBalance />}
              <UserMenu />
            </div>
          </div>
        </div>

        {/* Hero section - only show on home page */}
        {window.location.pathname === "/" && (
          <div className="border-t border-border/20">
            <div className="container mx-auto px-6 max-w-7xl py-16 text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-5 tracking-tight leading-none">
                <span className="gradient-text">ArtDirector Studio</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
                Reconstruct. Refine. Reimagine.
              </p>
            </div>
          </div>
        )}
      </header>

      <ImageBlendDialog open={showBlendDialog} onOpenChange={setShowBlendDialog} />
      <ImageUpscaleDialog open={showUpscaleDialog} onOpenChange={setShowUpscaleDialog} />
      <BatchProcessDialog open={showBatchDialog} onOpenChange={setShowBatchDialog} />
    </TooltipProvider>
  );
};
