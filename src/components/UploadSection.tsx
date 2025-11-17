import { useCallback } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { getModifierKey } from "@/hooks/useKeyboardShortcuts";
import { compressImage } from "@/lib/imageCompression";

interface UploadSectionProps {
  onFileSelect: (file: File) => void;
  previewUrl: string | null;
  onAnalyze: () => void;
  disabled: boolean;
}

export const UploadSection = ({ 
  onFileSelect, 
  previewUrl, 
  onAnalyze,
  disabled 
}: UploadSectionProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const modKey = getModifierKey();

  const handleAuthCheck = useCallback(() => {
    if (!user) {
      toast.info("Please sign in to upload and analyze images", {
        description: "Create an account or log in to get started",
        action: {
          label: "Sign In",
          onClick: () => navigate("/auth")
        }
      });
      return false;
    }
    return true;
  }, [user, navigate]);

  const compressAndSelectFile = useCallback(
    async (file: File) => {
      try {
        // Only compress if file is larger than 1MB
        if (file.size > 1024 * 1024) {
          toast.info("Compressing image...");
          const compressedFile = await compressImage(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
          });
          const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(0);
          toast.success(`Image compressed by ${compressionRatio}%`);
          onFileSelect(compressedFile);
        } else {
          onFileSelect(file);
        }
      } catch (error) {
        console.error("Compression error or library failed to load:", error);
        toast.error("Failed to compress image, using original");
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      
      if (!handleAuthCheck()) return;
      
      const file = e.dataTransfer.files[0];
      
      if (!file) return;
      
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (PNG or JPG)");
        return;
      }
      
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File size must be less than 15MB");
        return;
      }
      
      compressAndSelectFile(file);
    },
    [compressAndSelectFile, handleAuthCheck]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!handleAuthCheck()) {
      e.target.value = '';
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG or JPG)");
      return;
    }
    
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be less than 15MB");
      return;
    }
    
    compressAndSelectFile(file);
  };

  return (
    <section className="space-y-8">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="group relative border-2 border-dashed border-border/60 rounded-2xl p-16 text-center hover:border-foreground/30 hover:bg-accent/20 transition-all duration-300 cursor-pointer overflow-hidden"
      >
        {/* Gradient background on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {previewUrl ? (
          <div className="relative space-y-6 animate-scale-in">
            <div className="relative inline-block bg-muted rounded-xl p-4 flex items-center justify-center min-h-[200px]">
              <OptimizedImage
                src={previewUrl} 
                alt="Preview" 
                className="max-h-80 w-auto object-contain mx-auto rounded-xl shadow-strong ring-1 ring-border/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                sizes="(max-width: 768px) 100vw, 50vw"
                widths={[640, 1024]}
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-foreground/10 pointer-events-none" />
            </div>
            <p className="text-sm text-muted-foreground">
              Click anywhere or drag & drop to change image
            </p>
          </div>
        ) : (
          <div className="relative space-y-6 animate-fade-in">
            <div className="inline-flex p-6 rounded-2xl bg-accent/50 group-hover:bg-accent transition-colors duration-300">
              <Upload className="w-12 h-12 text-muted-foreground group-hover:text-foreground transition-colors duration-300" />
            </div>
            <div className="space-y-3">
              <p className="text-xl font-medium">
                Drop your image here
              </p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                or click to browse • PNG or JPG • up to 15MB
              </p>
            </div>
          </div>
        )}
      </div>
      
      {previewUrl && (
        <div className="flex justify-center animate-slide-up">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={onAnalyze}
                disabled={disabled}
                size="lg"
                className="min-w-[240px] h-12 text-base shadow-medium hover:shadow-strong"
              >
                Analyze Image
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Analyze Image ({modKey}+Enter)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </section>
  );
};
