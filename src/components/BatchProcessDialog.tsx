import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, CheckCircle2, Clock, AlertCircle, Loader2, Eye, Download, Trash2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { mapErrorMessage, TOOL_ERROR_MESSAGES } from "@/lib/toolErrorMessages";

interface BatchProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

type OperationType = 'analyze' | 'upscale';

export const BatchProcessDialog = ({ open, onOpenChange }: BatchProcessDialogProps) => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [operation, setOperation] = useState<OperationType>('upscale');
  const [targetSize, setTargetSize] = useState<'1536x1536' | '2048x2048'>('1536x1536');
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (queue.length + files.length > 10) {
      toast.error(TOOL_ERROR_MESSAGES.BATCH_FILE_COUNT);
      return;
    }

    const newItems: QueueItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      idempotencyKey: crypto.randomUUID(), // Pre-generate for idempotency
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
          action: 'batch',
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

      if (dbError) throw dbError;
      return assetData.id;
    }

    // For upscale, save the image
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uuid = crypto.randomUUID();
    const fileName = `results/${user.id}/${yearMonth}/batch/${uuid}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(fileName, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    const { data: assetData, error: dbError } = await supabase
      .from('generated_assets')
      .insert({
        user_id: user.id,
        type: 'image',
        action: 'batch',
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

    if (dbError) throw dbError;
    return assetData.id;
  };

  const processQueue = async () => {
    if (queue.length === 0) {
      toast.error("Please add images to the queue");
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);

    const startIndex = isPaused ? currentIndex : 0;
    if (!isPaused) setCurrentIndex(0);

    for (let i = startIndex; i < queue.length; i++) {
      if (isPaused) break;

      const item = queue[i];
      if (item.status !== 'pending') continue;

      setCurrentIndex(i);
      const itemStartTime = Date.now();
      item.startTime = itemStartTime;
      
      // Update to processing
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

        if (operation === 'upscale') {
          result = await processUpscale(item);
          const duration = Date.now() - itemStartTime;
          
          // Convert to base64 for source storage
          const reader = new FileReader();
          const originalBase64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(item.file);
          });
          
          assetId = await saveToDatabase(result, 'upscale', targetSize, originalBase64, duration);
        } else {
          // Analyze
          result = await processAnalyze(item);
          const duration = Date.now() - itemStartTime;
          
          const reader = new FileReader();
          const originalBase64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(item.file);
          });
          
          assetId = await saveToDatabase('', 'analyze', '', originalBase64, duration, result);
        }

        clearInterval(progressInterval);

        // Update to completed
        setQueue(prev => prev.map((q, idx) => 
          idx === i 
            ? { ...q, status: 'completed', progress: 100, result, assetId } 
            : q
        ));

        // Small delay between items
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

  useEffect(() => {
    return () => {
      queue.forEach(item => URL.revokeObjectURL(item.preview));
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Batch Image Processing
            <Badge variant="secondary">{stats.total} items</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Settings */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Operation</label>
                  <Select
                    value={operation}
                    onValueChange={(value) => setOperation(value as OperationType)}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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

              {/* Upload Button */}
              {!isProcessing && (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="batch-upload"
                  />
                  <label htmlFor="batch-upload" className="cursor-pointer min-h-[44px] flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to add images (up to 10 total)
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

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          {!isProcessing && stats.completed > 0 && (
            <Button variant="outline" onClick={clearCompleted}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Completed
            </Button>
          )}
          
          {stats.completed > 0 && (
            <Button variant="outline" onClick={handleViewAll}>
              <Eye className="w-4 h-4 mr-2" />
              View All Results
            </Button>
          )}

          <div className="flex-1" />

          {isProcessing && !isPaused && (
            <Button variant="outline" onClick={handlePause}>
              Pause
            </Button>
          )}

          {!isProcessing && isPaused && stats.pending > 0 && (
            <Button onClick={handleResume} className="min-w-[140px]">
              Resume Processing
            </Button>
          )}

          {!isProcessing && !isPaused && (
            <Button
              onClick={processQueue}
              disabled={stats.pending === 0}
              className="min-w-[140px] min-h-[44px]"
            >
              Process {stats.pending} Image{stats.pending !== 1 ? 's' : ''}
            </Button>
          )}

          {isProcessing && !isPaused && (
            <Button disabled className="min-w-[140px] min-h-[44px]">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing {currentIndex + 1}/{stats.total}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};