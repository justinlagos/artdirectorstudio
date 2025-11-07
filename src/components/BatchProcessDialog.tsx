import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, Layers, Upload, X, CheckCircle2, AlertCircle, Sparkles, FolderOpen, RefreshCw, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

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
  analysisData?: any;
  imageUrl?: string;
  error?: string;
  errorType?: 'rate_limit' | 'credits' | 'generic';
}

export const BatchProcessDialog = ({ open, onOpenChange }: BatchProcessDialogProps) => {
  const navigate = useNavigate();
  const [images, setImages] = useState<BatchImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("");

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
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue.");
        setIsProcessing(false);
        return;
      }

      const totalImages = images.length;
      let completedCount = 0;

      // Process each image sequentially
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        setProcessingStep(`Processing ${i + 1} of ${totalImages}…`);
        
        setImages(prev => 
          prev.map(img => 
            img.id === image.id ? { ...img, status: 'processing' as const } : img
          )
        );

        try {
          // Convert file to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(image.file);
          });

          // Analyze the image
          const { data, error } = await supabase.functions.invoke("analyze-image", {
            body: { image: base64 },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (error) throw error;

          // Save to My Projects and get image URL
          const imageUrl = await saveAnalysisToMyProjects(base64, data.full_regeneration_prompt, image.file.name);

          setImages(prev =>
            prev.map(img =>
              img.id === image.id
                ? { 
                    ...img, 
                    status: 'completed' as const, 
                    result: data.full_regeneration_prompt,
                    analysisData: data.analysis,
                    imageUrl: imageUrl || base64
                  }
                : img
            )
          );

          completedCount++;
          setCurrentProgress((completedCount / totalImages) * 100);
        } catch (error: any) {
          console.error(`Error processing image ${image.file.name}:`, error);
          
          // Parse error type for better messaging
          let errorMessage = 'Failed to analyze';
          let errorType: 'rate_limit' | 'credits' | 'generic' = 'generic';
          
          if (error?.message?.includes('429') || error?.message?.toLowerCase().includes('rate limit')) {
            errorMessage = 'Rate limit exceeded. Wait a moment and retry.';
            errorType = 'rate_limit';
          } else if (error?.message?.includes('402') || error?.message?.toLowerCase().includes('credit')) {
            errorMessage = 'Credits exhausted. Add credits to continue.';
            errorType = 'credits';
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          setImages(prev =>
            prev.map(img =>
              img.id === image.id
                ? { ...img, status: 'error' as const, error: errorMessage, errorType }
                : img
            )
          );
          completedCount++;
          setCurrentProgress((completedCount / totalImages) * 100);
        }

        // Small delay between requests to avoid rate limiting
        if (i < images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = images.filter(img => img.status === 'completed').length;
      const failedCount = images.filter(img => img.status === 'error').length;
      
      if (failedCount > 0) {
        toast.success(`${successCount} of ${totalImages} completed successfully`);
      } else {
        toast.success(`Done — all ${totalImages} images processed successfully`);
      }
      
      setProcessingStep("");
    } catch (error) {
      console.error("Batch process error:", error);
      toast.error("Batch processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveAnalysisToMyProjects = async (imageBase64: string, prompt: string, fileName: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Convert base64 to blob
      const response = await fetch(imageBase64);
      const blob = await response.blob();
      
      // Upload to storage
      const storageFileName = `${user.id}/analyzed-${Date.now()}-${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(storageFileName, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('generated-images')
        .getPublicUrl(storageFileName);

      // Save metadata
      await supabase
        .from('generated_assets')
        .insert({
          user_id: user.id,
          type: 'analysis',
          image_url: publicUrl,
          prompt: prompt,
          quality: 'standard',
          size: 'original'
        });
      
      return publicUrl;
    } catch (error) {
      console.error('Error saving analysis:', error);
      return null;
    }
  };

  const handleRetryFailed = async () => {
    const failedImages = images.filter(img => img.status === 'error');
    
    if (failedImages.length === 0) return;

    // Reset failed images to pending
    setImages(prev =>
      prev.map(img =>
        img.status === 'error' ? { ...img, status: 'pending' as const, error: undefined } : img
      )
    );

    // Process only failed images
    setIsProcessing(true);
    setCurrentProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue.");
        setIsProcessing(false);
        return;
      }

      for (let i = 0; i < failedImages.length; i++) {
        const image = failedImages[i];
        
        setProcessingStep(`Retrying ${i + 1} of ${failedImages.length}…`);
        
        setImages(prev =>
          prev.map(img =>
            img.id === image.id ? { ...img, status: 'processing' as const } : img
          )
        );

        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(image.file);
          });

          const { data, error } = await supabase.functions.invoke("analyze-image", {
            body: { image: base64 },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (error) throw error;

          const imageUrl = await saveAnalysisToMyProjects(base64, data.full_regeneration_prompt, image.file.name);

          setImages(prev =>
            prev.map(img =>
              img.id === image.id
                ? { 
                    ...img, 
                    status: 'completed' as const, 
                    result: data.full_regeneration_prompt,
                    analysisData: data.analysis,
                    imageUrl: imageUrl || base64
                  }
                : img
            )
          );

          setCurrentProgress(((i + 1) / failedImages.length) * 100);
        } catch (error: any) {
          console.error(`Error processing image ${image.file.name}:`, error);
          
          let errorMessage = 'This didn\'t complete. Try again.';
          let errorType: 'rate_limit' | 'credits' | 'generic' = 'generic';
          
          if (error?.message?.includes('429') || error?.message?.toLowerCase().includes('rate limit')) {
            errorMessage = 'Rate limit exceeded. Wait a moment.';
            errorType = 'rate_limit';
          } else if (error?.message?.includes('402') || error?.message?.toLowerCase().includes('credit')) {
            errorMessage = 'Credits exhausted. Add credits.';
            errorType = 'credits';
          }
          
          setImages(prev =>
            prev.map(img =>
              img.id === image.id
                ? { ...img, status: 'error' as const, error: errorMessage, errorType }
                : img
            )
          );
        }

        if (i < failedImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = images.filter(img => img.status === 'completed').length;
      toast.success(`Retry complete! ${successCount} total images processed`);
      setProcessingStep("");
    } catch (error) {
      console.error("Retry error:", error);
      toast.error("Retry failed. Please try again.");
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
    onOpenChange(false);
  };

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

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

  const handleViewAnalysis = (img: BatchImage) => {
    if (!img.result) return;
    
    const content = `=== ${img.file.name} Analysis ===\n\n${img.result}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${img.file.name}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Analysis downloaded!");
  };

  const handleViewInStudio = (img: BatchImage) => {
    if (!img.imageUrl) return;
    navigate('/', { state: { scrollTo: 'studio' } });
    setTimeout(() => {
      const studioElement = document.getElementById('studio');
      if (studioElement) {
        studioElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    onOpenChange(false);
  };

  const completedImages = images.filter(img => img.status === 'completed');
  const hasCompleted = completedImages.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Batch Process Images
          </DialogTitle>
          <DialogDescription>
            Analyze images across 12 professional categories. Free while subscriptions are being finalized!
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
                {processingStep || `Processing images... ${Math.round(currentProgress)}%`}
              </p>
            </div>
          )}

          {/* Results Gallery */}
          {hasCompleted && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <Label className="text-base font-semibold">Completed Results ({completedImages.length})</Label>
              </div>
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="grid grid-cols-2 gap-3 p-4">
                  {completedImages.map((img) => (
                    <Card 
                      key={img.id}
                      className="overflow-hidden hover:shadow-lg transition-all animate-scale-in"
                    >
                      <div className="relative aspect-square">
                        <img 
                          src={img.imageUrl || img.preview} 
                          alt={img.file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500 bg-white rounded-full" />
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-xs font-medium truncate">{img.file.name}</p>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewAnalysis(img)}
                            className="flex-1 text-xs h-7"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewInStudio(img)}
                            className="flex-1 text-xs h-7"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Studio
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Processing/Pending Images List */}
          {images.length > 0 && images.some(img => img.status !== 'completed') && (
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="space-y-2 p-4">
                {images.filter(img => img.status !== 'completed').map((img) => (
                  <div 
                    key={img.id}
                    className={`flex items-center gap-3 p-3 bg-card border rounded-lg transition-all ${
                      img.status === 'error' ? 'border-red-500/50 bg-red-50/10' :
                      'border-border'
                    }`}
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
                      {img.status === 'error' && img.error && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-500">{img.error}</p>
                        </div>
                      )}
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
          <div className="space-y-2">
            {images.some(img => img.status === 'completed' || img.status === 'error') && (
              <div className="flex gap-2">
                {images.some(img => img.status === 'completed') && (
                  <>
                    <Button
                      onClick={handleDownloadAll}
                      variant="secondary"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Results
                    </Button>
                    <Button
                      onClick={() => navigate('/history')}
                      variant="outline"
                      className="flex-1"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      My Projects
                    </Button>
                  </>
                )}
              </div>
            )}
            
            {images.some(img => img.status === 'error') && !isProcessing && (
              <Button
                onClick={handleRetryFailed}
                variant="destructive"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Failed Only
              </Button>
            )}
            
            {images.length > 0 && images.every(img => img.status === 'pending') && (
              <Button
                onClick={handleBatchProcess}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                <Layers className="w-4 h-4 mr-2" />
                {isProcessing ? "Processing..." : `Analyze ${images.length} Images`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
