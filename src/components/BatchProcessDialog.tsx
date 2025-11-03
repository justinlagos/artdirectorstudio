import { useState, useEffect } from "react";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, Layers, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BatchProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BatchImage {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: string;
  error?: string;
}

export const BatchProcessDialog = ({ open, onOpenChange }: BatchProcessDialogProps) => {
  const { captureOrigin, returnToOrigin } = useNavigationContext();
  const [images, setImages] = useState<BatchImage[]>([]);

  useEffect(() => {
    if (open) captureOrigin();
  }, [open, captureOrigin]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 10) {
      toast.error("Maximum 10 images allowed for batch processing");
      return;
    }

    const newImages: BatchImage[] = files.map(file => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload image files only");
        return null;
      }

      return {
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const
      };
    }).filter(Boolean) as BatchImage[];

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleBatchProcess = async () => {
    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setIsProcessing(true);
    setCurrentProgress(0);

    try {
      const { batchAnalyzeImages } = await import("@/lib/services/toolsService");
      
      const result = await batchAnalyzeImages(
        images.map(img => img.file),
        (current, total) => {
          setCurrentProgress((current / total) * 100);
          
          // Update individual image status
          setImages(prev => 
            prev.map((img, idx) => {
              if (idx < current) {
                return { ...img, status: 'completed' as const };
              } else if (idx === current) {
                return { ...img, status: 'processing' as const };
              }
              return img;
            })
          );
        }
      );

      // Update final results
      result.results.forEach((res, idx) => {
        setImages(prev =>
          prev.map((img, i) =>
            i === idx
              ? {
                  ...img,
                  status: res.success ? 'completed' as const : 'error' as const,
                  result: res.data?.full_regeneration_prompt,
                  error: res.error
                }
              : img
          )
        );
      });

      const successCount = result.results.filter(r => r.success).length;
      toast.success(`Batch processing complete! ${successCount}/${result.results.length} images analyzed`);
    } catch (error) {
      console.error("Batch process error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Full error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      toast.error(`Batch processing failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAll = () => {
    const completedImages = images.filter(img => img.status === 'completed' && img.result);
    
    if (completedImages.length === 0) {
      toast.error("No completed results to download");
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const content = completedImages.map((img, index) => {
      return `=== IMAGE ${index + 1}: ${img.file.name} ===\n\n${img.result}\n\n`;
    }).join('\n' + '='.repeat(80) + '\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-analysis-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Batch results downloaded!");
  };

  const handleClose = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setCurrentProgress(0);
    returnToOrigin();
    onOpenChange(false);
  };

  const getStatusIcon = (status: BatchImage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Batch Process Images
          </DialogTitle>
          <DialogDescription>
            Upload multiple images to analyze them all at once. Cost: <span className="font-semibold text-foreground">1 credit per image</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          {/* Upload Area */}
          {images.length < 10 && (
            <div className="space-y-2">
              <Label>Upload Images ({images.length}/10)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-foreground/20 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="batch-images"
                  disabled={isProcessing}
                />
                <label htmlFor="batch-images" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload images (up to 10)
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={currentProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Processing images... {Math.round(currentProgress)}%
              </p>
            </div>
          )}

          {/* Images List */}
          {images.length > 0 && (
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="space-y-2 p-4">
                {images.map((img) => (
                  <div 
                    key={img.id}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
                  >
                    <img 
                      src={img.preview} 
                      alt={img.file.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{img.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(img.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(img.status)}
                      {img.status === 'pending' && !isProcessing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImage(img.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {images.some(img => img.status === 'completed') && (
              <Button
                onClick={handleDownloadAll}
                variant="secondary"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download All Results
              </Button>
            )}
            {images.length > 0 && images.every(img => img.status === 'pending') && (
              <Button
                onClick={handleBatchProcess}
                disabled={isProcessing}
                className="flex-1"
                size="lg"
              >
                <Layers className="w-4 h-4 mr-2" />
                {isProcessing ? "Processing..." : `Process ${images.length} Images (${images.length} Credits)`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
