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
      <header className="border-b border-border py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                title="Home"
              >
                <Home className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Home</span>
              </Button>
              {user && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/gallery")}
                    className="hidden md:flex"
                  >
                    <Images className="w-4 h-4 mr-2" />
                    Gallery
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/analytics")}
                    className="hidden md:flex"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBlendDialog(true)}
                    className="hidden md:flex"
                  >
                    <Blend className="w-4 h-4 mr-2" />
                    Blend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpscaleDialog(true)}
                    className="hidden md:flex"
                  >
                    <Maximize2 className="w-4 h-4 mr-2" />
                    Upscale
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBatchDialog(true)}
                    className="hidden md:flex"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Batch
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {user && <CreditBalance />}
              <UserMenu />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-semibold mb-3">
              ArtDirector Studio
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Reconstruct. Refine. Reimagine.
            </p>
          </div>
        </div>
      </header>

      <ImageBlendDialog open={showBlendDialog} onOpenChange={setShowBlendDialog} />
      <ImageUpscaleDialog open={showUpscaleDialog} onOpenChange={setShowUpscaleDialog} />
      <BatchProcessDialog open={showBatchDialog} onOpenChange={setShowBatchDialog} />
    </>
  );
};
