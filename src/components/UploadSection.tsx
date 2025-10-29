import { useCallback } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
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
      
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    onFileSelect(file);
  };

  return (
    <section className="space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-foreground/20 transition-colors cursor-pointer bg-card shadow-subtle"
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {previewUrl ? (
          <div className="space-y-4">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="max-h-64 mx-auto rounded-lg shadow-medium"
            />
            <p className="text-sm text-muted-foreground">
              Click to change image or drag & drop a new one
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                Drop your image here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                PNG or JPG up to 15MB
              </p>
            </div>
          </div>
        )}
      </div>
      
      {previewUrl && (
        <div className="flex justify-center">
          <Button 
            onClick={onAnalyze}
            disabled={disabled}
            size="lg"
            className="min-w-[200px]"
          >
            Analyze Image
          </Button>
        </div>
      )}
    </section>
  );
};
