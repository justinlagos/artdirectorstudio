import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, CheckCircle2, Clock, AlertCircle, Loader2, Eye, Download, Trash2, Pause, Play, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { mapErrorMessage, TOOL_ERROR_MESSAGES } from "@/lib/toolErrorMessages";
import { useToolsModal } from "@/contexts/ToolsModalContext";
import { ToolDrawer } from "./ToolDrawer";

interface BatchProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialOperation?: OperationType;
}

interface QueueItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: string;
  error?: string;
  assetId?: string;
  idempotencyKey?: string;
  startTime?: number;
}

type OperationType = 'analyze' | 'upscale' | 'generate' | 'blend';

export const BatchProcessDialog = ({ open, onOpenChange, initialOperation }: BatchProcessDialogProps) => {
  const navigate = useNavigate();
  const { openGenerateDialog } = useToolsModal();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [operation, setOperation] = useState<OperationType>('upscale');
  const [targetSize, setTargetSize] = useState<'1536x1536' | '2048x2048'>('1536x1536');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [blendInstruction, setBlendInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const stats = {
    total: queue.length,
    pending: queue.filter(item => item.status === 'pending').length,
    processing: queue.filter(item => item.status === 'processing').length,
    completed: queue.filter(item => item.status === 'completed').length,
    failed: queue.filter(item => item.status === 'failed').length,
  };

  useEffect(() => {
    if (open && initialOperation) {
      setOperation(initialOperation);
    }
  }, [open, initialOperation]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast.error(`Unsupported file type. Please upload JPG, PNG, or WebP images only.`);
      return;
    }
    
    // Validate file sizes (15MB limit)
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      toast.error(`File too large. Maximum 15MB per file.`);
      return;
    }
    
    // Blend requires exactly 2 images, others allow up to 10
    const maxFiles = operation === 'blend' ? 2 : 10;
    const requiredFiles = operation === 'blend' ? 2 : 1;
    
    if (operation === 'blend' && queue.length + files.length !== 2) {
      toast.error('Blend requires exactly 2 images. Please upload 2 images.');
      return;
    }
    
    if (queue.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} image${maxFiles > 1 ? 's' : ''} allowed for ${operation} operation.`);
      return;
    }

    const newItems: QueueItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      idempotencyKey: crypto.randomUUID(),
    }));

    setQueue(prev => [...prev, ...newItems]);
    toast.success(`${files.length} image${files.length > 1 ? 's' : ''} added to queue`);
  };

  const removeItem = (id: string) => {
    setQueue(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearCompleted = () => {
    setQueue(prev => {
      const completed = prev.filter(i => i.status === 'completed');
      completed.forEach(item => URL.revokeObjectURL(item.preview));
      return prev.filter(i => i.status !== 'completed');
    });
    toast.success("Cleared completed items");
  };

  const processUpscale = async (item: QueueItem): Promise<string> => {
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(item.file);
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please sign in to use this feature.");

    const { data, error } = await supabase.functions.invoke("upscale-image", {
      body: { 
        image: base64Image, 
        targetSize,
        idempotencyKey: item.idempotencyKey 
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;
    if (!data?.image) throw new Error("No image returned");

    return data.image;
  };

  const processAnalyze = async (item: QueueItem): Promise<any> => {
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(item.file);
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please sign in to use this feature.");

    const { data, error } = await supabase.functions.invoke("analyze-image", {
      body: { 
        image: base64Image,
        idempotencyKey: item.idempotencyKey 
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;
    if (!data) throw new Error("No analysis returned");

    return data;
  };

  const processGenerate = async (item: QueueItem): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please sign in to use this feature.");

    if (!generatePrompt?.trim()) {
      throw new Error("Please enter a prompt for generation");
    }

    const { data, error } = await supabase.functions.invoke("generate-image", {
      body: { 
        prompt: generatePrompt,
        quality: 'auto',
        size: '1024x1024',
        idempotencyKey: item.idempotencyKey 
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;
    if (!data?.image) throw new Error("No image returned");

    return data.image;
  };

  const processBlend = async (): Promise<string> => {
    if (queue.length !== 2) {
      throw new Error("Blend requires exactly 2 images");
    }

    const images = await Promise.all(
      queue.map(item => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(item.file);
      }))
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please sign in to use this feature.");

    const { data, error } = await supabase.functions.invoke("blend-images", {
      body: { 
        images,
        instruction: blendInstruction || 'Blend these images seamlessly',
        idempotencyKey: crypto.randomUUID()
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;
    if (!data?.image) throw new Error("No blended image returned");

    return data.image;
  };

  const saveToDatabase = async (
    imageDataUrl: string, 
    operationType: string, 
    size: string,
    sourceImage: string,
    duration: number,
    analysisData?: any
  ): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    // For analyze, we don't have an image to save, just analysis data
    if (operationType === 'analyze') {
      const { data: assetData, error: dbError } = await supabase
        .from('generated_assets')
        .insert({
          user_id: user.id,
          type: 'analysis',
          action: 'batch_analyze',
          prompt: analysisData?.full_regeneration_prompt || 'Batch analysis',
          analysis_data: analysisData,
          source_urls: [sourceImage],
          params: {
            operation: 'analyze',
            batchItem: true
          },
          duration_ms: duration,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Failed to save analysis to database:', dbError);
        throw dbError;
      }
      return assetData.id;
    }

    // For other operations, save the image
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uuid = crypto.randomUUID();
    // RLS policy requires first folder to be user ID
    const fileName = `${user.id}/batch/${yearMonth}/${uuid}.png`;
    
    // Retry upload up to 3 times
    let uploadError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase.storage
        .from('generated-images')
        .upload(fileName, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (!error) {
        uploadError = null;
        break;
      }
      
      uploadError = error;
      console.warn(`Upload attempt ${attempt + 1} failed:`, error);
      
      if (attempt < 2) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }

    if (uploadError) {
      console.error('All upload attempts failed:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    // Verify file exists
    const { error: headError } = await supabase.storage
      .from('generated-images')
      .list(fileName.split('/').slice(0, -1).join('/'), {
        search: fileName.split('/').pop()
      });

    if (headError) {
      console.error('File verification failed:', headError);
      throw new Error('Upload succeeded but file verification failed');
    }

    const { data: assetData, error: dbError } = await supabase
      .from('generated_assets')
      .insert({
        user_id: user.id,
        type: 'image',
        action: `batch_${operationType}`,
        image_url: publicUrl,
        prompt: `Batch ${operationType} to ${size}`,
        source_urls: [sourceImage],
        params: {
          operation: operationType,
          targetSize: size,
          batchItem: true
        },
        duration_ms: duration,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to save to database:', dbError);
      throw dbError;
    }
    return assetData.id;
  };

  const processQueue = async () => {
    if (queue.length === 0) {
      toast.error("Please add images to the queue");
      return;
    }

    if (operation === 'generate' && !generatePrompt?.trim()) {
      toast.error("Please enter a prompt for generation");
      return;
    }

    if (operation === 'blend' && queue.length !== 2) {
      toast.error("Blend requires exactly 2 images");
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);

    // Special handling for blend - process all at once
    if (operation === 'blend') {
      setCurrentIndex(0);
      const itemStartTime = Date.now();
      
      // Mark all as processing
      setQueue(prev => prev.map(q => ({ ...q, status: 'processing' as const, progress: 10 })));

      try {
        const progressInterval = setInterval(() => {
          setQueue(prev => prev.map(q => 
            q.progress < 90 ? { ...q, progress: q.progress + 10 } : q
          ));
        }, 2000);

        const result = await processBlend();
        const duration = Date.now() - itemStartTime;
        
        // Get original images as base64
        const originalImages = await Promise.all(
          queue.map(item => new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(item.file);
          }))
        );
        
        const assetId = await saveToDatabase(
          result, 
          'blend', 
          'blended', 
          JSON.stringify(originalImages), 
          duration
        );

        clearInterval(progressInterval);

        // Mark all as completed with same result
        setQueue(prev => prev.map(q => ({ 
          ...q, 
          status: 'completed' as const, 
          progress: 100, 
          result, 
          assetId 
        })));

        toast.success("Blend completed successfully!");
      } catch (error: any) {
        console.error('Blend failed:', error);
        const errorMsg = mapErrorMessage(error);
        setQueue(prev => prev.map(q => ({ 
          ...q, 
          status: 'failed' as const, 
          error: errorMsg 
        })));
      }

      setIsProcessing(false);
      return;
    }

    // Standard processing for other operations
    const startIndex = isPaused ? currentIndex : 0;
    if (!isPaused) setCurrentIndex(0);

    for (let i = startIndex; i < queue.length; i++) {
      if (isPaused) break;

      const item = queue[i];
      if (item.status !== 'pending') continue;

      setCurrentIndex(i);
      const itemStartTime = Date.now();
      item.startTime = itemStartTime;
      
      setQueue(prev => prev.map((q, idx) => 
        idx === i ? { ...q, status: 'processing', progress: 10 } : q
      ));

      try {
        const progressInterval = setInterval(() => {
          setQueue(prev => prev.map((q, idx) => 
            idx === i && q.progress < 90 
              ? { ...q, progress: q.progress + 10 } 
              : q
          ));
        }, 2000);

        let result: string | any;
        let assetId: string;

        const reader = new FileReader();
        const originalBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(item.file);
        });

        if (operation === 'upscale') {
          result = await processUpscale(item);
          const duration = Date.now() - itemStartTime;
          assetId = await saveToDatabase(result, 'upscale', targetSize, originalBase64, duration);
        } else if (operation === 'analyze') {
          result = await processAnalyze(item);
          const duration = Date.now() - itemStartTime;
          assetId = await saveToDatabase('', 'analyze', '', originalBase64, duration, result);
        } else if (operation === 'generate') {
          result = await processGenerate(item);
          const duration = Date.now() - itemStartTime;
          assetId = await saveToDatabase(result, 'generate', '1024x1024', originalBase64, duration);
        }

        clearInterval(progressInterval);

        setQueue(prev => prev.map((q, idx) => 
          idx === i 
            ? { ...q, status: 'completed', progress: 100, result, assetId } 
            : q
        ));

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        console.error(`Failed to process item ${i}:`, error);
        const errorMsg = mapErrorMessage(error);
        setQueue(prev => prev.map((q, idx) => 
          idx === i 
            ? { ...q, status: 'failed', error: errorMsg } 
            : q
        ));
      }
    }

    if (!isPaused) {
      setIsProcessing(false);
      const completedCount = queue.filter(i => i.status === 'completed').length;
      toast.success(`Batch processing completed! ${completedCount} of ${queue.length} items processed.`);
    } else {
      setIsProcessing(false);
      toast.info("Batch processing paused");
    }
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
    processQueue();
  };

  const handleDownload = (item: QueueItem) => {
    if (!item.result) return;
    
    const link = document.createElement('a');
    link.href = item.result;
    link.download = `processed-${item.file.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewAll = () => {
    navigate('/history');
    onOpenChange(false);
  };

  const handleUseInStudio = () => {
    const completedCount = queue.filter(i => i.status === 'completed').length;
    if (completedCount === 0) return;
    
    // Generate a prompt based on the batch operation
    let studioPrompt = '';
    if (operation === 'analyze') {
      studioPrompt = `Create variations based on these ${completedCount} analyzed images`;
    } else if (operation === 'upscale') {
      studioPrompt = `Generate high-resolution variations of these ${completedCount} upscaled images`;
    }
    
    openGenerateDialog(studioPrompt);
    onOpenChange(false);
  };

  useEffect(() => {
    return () => {
      queue.forEach(item => URL.revokeObjectURL(item.preview));
    };
  }, []);

  const bodyContent = (
    <div className="space-y-4">
          {/* Settings */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Operation</label>
                  <Select
                    value={operation}
                    onValueChange={(value) => {
                      setOperation(value as OperationType);
                      setQueue([]); // Clear queue when changing operation
                    }}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generate">Generate from Prompt</SelectItem>
                      <SelectItem value="blend">Blend 2 Images</SelectItem>
                      <SelectItem value="upscale">Upscale All</SelectItem>
                      <SelectItem value="analyze">Analyze All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {operation === 'upscale' && (
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Target Size</label>
                    <Select
                      value={targetSize}
                      onValueChange={(value) => setTargetSize(value as any)}
                      disabled={isProcessing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1536x1536">High (1536×1536)</SelectItem>
                        <SelectItem value="2048x2048">Ultra (2048×2048)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Prompt for Generate */}
              {operation === 'generate' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Generation Prompt</label>
                  <Textarea
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="Enter a prompt to generate images for each uploaded reference..."
                    disabled={isProcessing}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This prompt will be used to generate an image for each uploaded reference image.
                  </p>
                </div>
              )}

              {/* Instruction for Blend */}
              {operation === 'blend' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Blend Instruction (Optional)</label>
                  <Input
                    value={blendInstruction}
                    onChange={(e) => setBlendInstruction(e.target.value)}
                    placeholder="e.g., 'Merge with cinematic lighting'"
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Upload exactly 2 images to blend them together.
                  </p>
                </div>
              )}

              {/* Upload Button */}
              {!isProcessing && (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple={operation !== 'blend'}
                    onChange={handleFileUpload}
                    className="hidden"
                    id="batch-upload"
                  />
                  <label htmlFor="batch-upload" className="cursor-pointer min-h-[44px] flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {operation === 'blend' 
                        ? 'Click to upload exactly 2 images' 
                        : 'Click to add images (up to 10 total)'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports: JPG, PNG, WebP (max 15MB each)
                    </p>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Bar */}
          {queue.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-muted-foreground">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-500">{stats.processing}</div>
                  <div className="text-xs text-muted-foreground">Processing</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Queue Items */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
              <TabsTrigger value="failed">Failed ({stats.failed})</TabsTrigger>
            </TabsList>

            {['all', 'pending', 'completed', 'failed'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-2 max-h-[400px] overflow-y-auto">
                {queue
                  .filter(item => tab === 'all' || item.status === tab)
                  .map((item, idx) => (
                    <Card key={item.id} className={cn(
                      "transition-all",
                      item.status === 'processing' && "ring-2 ring-primary"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Thumbnail */}
                          <img
                            src={item.preview}
                            alt={`Queue item ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded"
                          />

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium truncate">{item.file.name}</span>
                              {item.status === 'pending' && <Clock className="w-4 h-4 text-muted-foreground" />}
                              {item.status === 'processing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                              {item.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {item.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                            </div>

                            {item.status === 'processing' && (
                              <Progress value={item.progress} className="h-2" />
                            )}

                            {item.status === 'failed' && item.error && (
                              <p className="text-xs text-red-500">{item.error}</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1">
                            {item.status === 'completed' && item.result && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownload(item)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {!isProcessing && item.status !== 'processing' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {queue.filter(item => tab === 'all' || item.status === tab).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items in this category
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      );

  const footerContent = (
    <div className="flex flex-wrap items-center gap-2">
      {!isProcessing && stats.completed > 0 && (
        <Button variant="outline" onClick={clearCompleted} className="min-h-[44px]">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Completed
        </Button>
      )}

      {stats.completed > 0 && (
        <>
          <Button variant="outline" onClick={handleViewAll} className="min-h-[44px]">
            <Eye className="w-4 h-4 mr-2" />
            View All Results
          </Button>
          <Button onClick={handleUseInStudio} className="min-h-[44px]">
            <Wand2 className="w-4 h-4 mr-2" />
            Generate in Studio
          </Button>
        </>
      )}

      <div className="flex-1 min-w-[120px]" />

      {isProcessing && !isPaused && (
        <Button variant="outline" onClick={handlePause} className="min-h-[44px]">
          <Pause className="w-4 h-4 mr-2" />
          Pause
        </Button>
      )}

      {!isProcessing && isPaused && stats.pending > 0 && (
        <Button onClick={handleResume} className="min-w-[140px] min-h-[44px]">
          <Play className="w-4 h-4 mr-2" />
          Resume Processing
        </Button>
      )}

      {!isProcessing && !isPaused && (
        <Button
          onClick={processQueue}
          disabled={stats.pending === 0}
          className="min-w-[160px] min-h-[44px]"
        >
          Process {stats.pending || 0} Image{stats.pending !== 1 ? 's' : ''}
        </Button>
      )}

      {isProcessing && !isPaused && (
        <Button disabled className="min-w-[160px] min-h-[44px]">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing {currentIndex + 1}/{stats.total}
        </Button>
      )}
    </div>
  );

  return (
    <ToolDrawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
        } else {
          onOpenChange(false);
        }
      }}
      title={
        <>
          Batch Image Processing
          <Badge variant="secondary">{stats.total} items</Badge>
        </>
      }
      description="Upload, queue, and monitor multiple image operations: Generate, Blend, Upscale, or Analyze."
      className="sm:max-w-5xl"
      contentClassName="pb-6"
      footer={footerContent}
    >
      {bodyContent}
    </ToolDrawer>
  );
};
