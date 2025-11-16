import { useState, useEffect, useRef } from "react";
import * as React from "react";
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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[Batch] File input triggered', {
      hasFiles: !!e.target.files,
      fileCount: e.target.files?.length || 0,
      operation,
      currentQueueLength: queue.length
    });

    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) {
      console.warn('[Batch] No files selected');
      return;
    }

    console.log('[Batch] Processing files', {
      fileCount: files.length,
      fileNames: files.map(f => f.name),
      fileTypes: files.map(f => f.type),
      fileSizes: files.map(f => `${(f.size / 1024 / 1024).toFixed(2)}MB`)
    });
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      console.error('[Batch] Invalid file types', {
        invalidFiles: invalidFiles.map(f => ({ name: f.name, type: f.type }))
      });
      toast.error(`Unsupported file type. Please upload JPG, PNG, or WebP images only.`);
      // Reset input to allow retry
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // Validate file sizes (15MB limit)
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      console.error('[Batch] Files too large', {
        oversizedFiles: oversizedFiles.map(f => ({ name: f.name, size: `${(f.size / 1024 / 1024).toFixed(2)}MB` }))
      });
      toast.error(`File too large. Maximum 15MB per file.`);
      // Reset input to allow retry
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // Blend requires exactly 2 images, others allow up to 10
    const maxFiles = operation === 'blend' ? 2 : 10;
    const requiredFiles = operation === 'blend' ? 2 : 1;
    
    if (operation === 'blend' && queue.length + files.length !== 2) {
      console.error('[Batch] Blend requires exactly 2 images', {
        currentQueue: queue.length,
        newFiles: files.length,
        total: queue.length + files.length
      });
      toast.error('Blend requires exactly 2 images. Please upload 2 images.');
      // Reset input to allow retry
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    if (queue.length + files.length > maxFiles) {
      console.error('[Batch] Too many files', {
        currentQueue: queue.length,
        newFiles: files.length,
        maxFiles
      });
      toast.error(`Maximum ${maxFiles} image${maxFiles > 1 ? 's' : ''} allowed for ${operation} operation.`);
      // Reset input to allow retry
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    console.log('[Batch] Creating queue items');
    const newItems: QueueItem[] = files.map(file => {
      const preview = URL.createObjectURL(file);
      console.log('[Batch] Created preview for file', {
        fileName: file.name,
        previewUrl: preview.substring(0, 50)
      });
      return {
        id: crypto.randomUUID(),
        file,
        preview,
        status: 'pending',
        progress: 0,
        idempotencyKey: crypto.randomUUID(),
      };
    });

    console.log('[Batch] Adding items to queue', {
      newItemsCount: newItems.length,
      totalQueueLength: queue.length + newItems.length
    });

    setQueue(prev => {
      const updated = [...prev, ...newItems];
      console.log('[Batch] Queue updated', {
        previousLength: prev.length,
        newLength: updated.length
      });
      return updated;
    });
    
    toast.success(`${files.length} image${files.length > 1 ? 's' : ''} added to queue`);
    
    // Reset input to allow selecting same files again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    console.log('[Batch] Upload button clicked', {
      hasInputRef: !!fileInputRef.current,
      operation,
      isProcessing
    });
    
    if (fileInputRef.current) {
      // Force click on mobile - sometimes label clicks don't work
      fileInputRef.current.click();
    } else {
      console.error('[Batch] File input ref is null');
      toast.error('Upload input not available. Please refresh the page.');
    }
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

  const processUpscale = async (item: QueueItem): Promise<{ image: string, assetId?: string }> => {
    const itemId = item.id;
    console.log(`[Batch Upscale] Starting for item ${itemId}`, {
      fileName: item.file.name,
      fileSize: item.file.size,
      fileType: item.file.type,
      targetSize,
      idempotencyKey: item.idempotencyKey
    });

    // Validate file before processing
    if (!item.file.type.startsWith('image/')) {
      const error = `Invalid file type: ${item.file.type}. Expected image file.`;
      console.error(`[Batch Upscale] Validation failed for item ${itemId}:`, error);
      throw new Error(error);
    }

    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    if (item.file.size > MAX_FILE_SIZE) {
      const error = `File too large: ${(item.file.size / 1024 / 1024).toFixed(2)}MB. Max 15MB.`;
      console.error(`[Batch Upscale] Validation failed for item ${itemId}:`, error);
      throw new Error(error);
    }

    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        console.log(`[Batch Upscale] File converted to base64 for item ${itemId}`, {
          base64Length: result.length,
          estimatedSizeMB: (result.length / 1.33 / 1024 / 1024).toFixed(2)
        });
        resolve(result);
      };
      reader.onerror = (error) => {
        console.error(`[Batch Upscale] FileReader error for item ${itemId}:`, error);
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(item.file);
    });

    // Validate base64 image format
    if (!base64Image.startsWith('data:image/')) {
      const error = 'Invalid image format. Expected data URI.';
      console.error(`[Batch Upscale] Validation failed for item ${itemId}:`, error);
      throw new Error(error);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error(`[Batch Upscale] No session for item ${itemId}`);
      throw new Error("Please sign in to use this feature.");
    }

    console.log(`[Batch Upscale] Invoking edge function for item ${itemId}`);
    const { data, error } = await supabase.functions.invoke("upscale-image", {
      body: { 
        image: base64Image, 
        targetSize,
        idempotencyKey: item.idempotencyKey 
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) {
      console.error(`[Batch Upscale] Edge function error for item ${itemId}:`, {
        error: error.message,
        errorDetails: error
      });
      throw error;
    }
    
    if (!data?.image) {
      console.error(`[Batch Upscale] No image in response for item ${itemId}`, {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : []
      });
      throw new Error("No image returned");
    }

    console.log(`[Batch Upscale] Success for item ${itemId}`, {
      imageLength: data.image.length,
      hasThumbnail: !!data.thumbnail,
      hasAssetId: !!data.assetId,
      imageType: data.image.startsWith('http') ? 'url' : data.image.startsWith('data:') ? 'data-url' : 'unknown'
    });

    // Return both image URL and assetId if available
    return {
      image: data.image,
      assetId: data.assetId
    };
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

    if (error) {
      // Extract error details
      let errorData: any = error;
      if (error.context) {
        try {
          errorData = typeof error.context === 'string' 
            ? JSON.parse(error.context) 
            : error.context;
        } catch {
          errorData = error;
        }
      }
      
      // Check for 402 (credits exhausted)
      if (errorData?.details?.aiStatus === 402 || 
          errorData?.errorType === 'ai_error' && errorData?.details?.aiStatus === 402 ||
          error.message?.includes('402') ||
          error.message?.includes('Credits exhausted') ||
          error.message?.includes('credits exhausted')) {
        throw new Error("Your credits are used up. Choose a plan to continue.");
      }
      
      throw error;
    }
    
    if (!data) throw new Error("No analysis returned");

    return data;
  };

  const processGenerate = async (item: QueueItem): Promise<{ image: string; assetId?: string }> => {
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

    console.log('[Batch Generate] Success', {
      imageLength: data.image.length,
      hasAssetId: !!data.assetId,
      imageType: data.image.startsWith('http') ? 'url' : data.image.startsWith('data:') ? 'data-url' : 'unknown'
    });

    // Return both image URL and assetId if available
    return {
      image: data.image,
      assetId: data.assetId
    };
  };

  const processBlend = async (): Promise<{ image: string; assetId?: string }> => {
    console.log('[Batch Blend] Starting blend operation', {
      queueLength: queue.length,
      instruction: blendInstruction || 'none',
      fileNames: queue.map(q => q.file.name)
    });

    if (queue.length !== 2) {
      const error = `Blend requires exactly 2 images, got ${queue.length}`;
      console.error('[Batch Blend] Validation failed:', error);
      throw new Error(error);
    }

    // Validate all files before processing
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (!item.file.type.startsWith('image/')) {
        const error = `Image ${i + 1}: Invalid file type: ${item.file.type}`;
        console.error('[Batch Blend] Validation failed:', error);
        throw new Error(error);
      }
      if (item.file.size > MAX_FILE_SIZE) {
        const error = `Image ${i + 1}: File too large: ${(item.file.size / 1024 / 1024).toFixed(2)}MB. Max 15MB.`;
        console.error('[Batch Blend] Validation failed:', error);
        throw new Error(error);
      }
    }

    const images = await Promise.all(
      queue.map((item, index) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          console.log(`[Batch Blend] Image ${index + 1} converted to base64`, {
            fileName: item.file.name,
            base64Length: result.length
          });
          
          // Validate base64 format
          if (!result.startsWith('data:image/')) {
            reject(new Error(`Image ${index + 1}: Invalid base64 format`));
            return;
          }
          resolve(result);
        };
        reader.onerror = (error) => {
          console.error(`[Batch Blend] FileReader error for image ${index + 1}:`, error);
          reject(new Error(`Failed to read image ${index + 1}`));
        };
        reader.readAsDataURL(item.file);
      }))
    );

    console.log('[Batch Blend] All images converted, validating format');
    for (let i = 0; i < images.length; i++) {
      if (!images[i].startsWith('data:image/')) {
        const error = `Image ${i + 1}: Invalid image format`;
        console.error('[Batch Blend] Validation failed:', error);
        throw new Error(error);
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[Batch Blend] No session found');
      throw new Error("Please sign in to use this feature.");
    }

    const idempotencyKey = crypto.randomUUID();
    console.log('[Batch Blend] Invoking blend-images edge function', {
      imageCount: images.length,
      instruction: blendInstruction || 'default',
      idempotencyKey
    });

    const { data, error } = await supabase.functions.invoke("blend-images", {
      body: { 
        images,
        instruction: blendInstruction || 'Blend these images seamlessly',
        idempotencyKey
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) {
      console.error('[Batch Blend] Edge function error:', {
        error: error.message,
        errorDetails: error
      });
      throw error;
    }
    
    if (!data?.image) {
      console.error('[Batch Blend] No image in response', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : []
      });
      throw new Error("No blended image returned");
    }

    console.log('[Batch Blend] Success', {
      imageLength: data.image.length,
      hasThumbnail: !!data.thumbnail,
      hasAssetId: !!data.assetId,
      imageType: data.image.startsWith('http') ? 'url' : data.image.startsWith('data:') ? 'data-url' : 'unknown'
    });

    // Return both image URL and assetId if available
    return {
      image: data.image,
      assetId: data.assetId
    };
  };

  const saveToDatabase = async (
    imageDataUrl: string, 
    operationType: string, 
    size: string,
    sourceImage: string,
    duration: number,
    analysisData?: any,
    existingAssetId?: string
  ): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    // STEP 1: Verify authentication BEFORE any operations
    const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession();
    console.log('[Batch SaveToDatabase] Authentication check', {
      hasSession: !!authSession,
      hasUser: !!user,
      userId: user.id,
      sessionError: sessionError?.message,
      sessionExpiresAt: authSession?.expires_at,
      accessTokenPresent: !!authSession?.access_token,
      accessTokenLength: authSession?.access_token?.length || 0
    });

    if (!authSession) {
      console.error('[Batch SaveToDatabase] No valid session found', {
        userId: user.id,
        sessionError: sessionError?.message
      });
      throw new Error('Failed to upload images: Please sign in to continue');
    }

    if (!authSession.access_token) {
      console.error('[Batch SaveToDatabase] Session missing access token', {
        userId: user.id,
        sessionKeys: Object.keys(authSession)
      });
      throw new Error('Failed to upload images: Invalid session token');
    }

    // If edge function already saved to database and returned assetId, just update it with batchItem flag
    if (existingAssetId) {
      console.log('[Batch SaveToDatabase] Edge function already saved asset, updating with batchItem flag', {
        assetId: existingAssetId,
        operationType,
        userId: user.id
      });

      try {
        // First get the existing asset to preserve its params
        const { data: existingAsset, error: fetchError } = await supabase
          .from('generated_assets')
          .select('params, image_url')
          .eq('id', existingAssetId)
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          console.warn('[Batch SaveToDatabase] Could not fetch existing asset, will create new entry:', {
            error: fetchError.message,
            errorCode: fetchError.code,
            errorDetails: fetchError.details,
            errorHint: fetchError.hint,
            assetId: existingAssetId,
            userId: user.id
          });
          // Fall through to create new entry
        } else if (existingAsset) {
          console.log('[Batch SaveToDatabase] Found existing asset, updating params', {
            assetId: existingAssetId,
            currentParams: existingAsset.params,
            hasImageUrl: !!existingAsset.image_url
          });

          // Merge existing params with batchItem flag
          const updatedParams = {
            ...(existingAsset.params as Record<string, any> || {}),
            batchItem: true,
            operation: operationType,
            ...(size && { targetSize: size })
          };

          const { data: updatedAsset, error: updateError } = await supabase
            .from('generated_assets')
            .update({
              params: updatedParams
            })
            .eq('id', existingAssetId)
            .eq('user_id', user.id)
            .select()
            .single();

          if (updateError) {
            console.error('[Batch SaveToDatabase] Failed to update existing asset:', {
              error: updateError.message,
              errorCode: updateError.code,
              errorDetails: updateError.details,
              errorHint: updateError.hint,
              assetId: existingAssetId,
              userId: user.id
            });
            // Non-fatal - asset already exists, just log the error and fall through
          } else if (updatedAsset) {
            console.log('[Batch SaveToDatabase] ✅ Successfully updated existing asset with batchItem flag', {
              assetId: existingAssetId,
              updatedParams,
              imageUrl: updatedAsset.image_url?.substring(0, 100),
              hasImageUrl: !!updatedAsset.image_url
            });
            
            // CRITICAL: Return the assetId - the image URL is already in the edge function response
            // The calling code will use the image URL from the edge function response as 'result'
            return existingAssetId;
          } else {
            console.warn('[Batch SaveToDatabase] Update returned no data, falling through to re-upload', {
              assetId: existingAssetId
            });
          }
        }
      } catch (updateException) {
        console.error('[Batch SaveToDatabase] Exception during asset update:', {
          error: updateException instanceof Error ? updateException.message : String(updateException),
          stack: updateException instanceof Error ? updateException.stack : undefined,
          assetId: existingAssetId
        });
        // Fall through to re-upload
      }
    } else {
      console.log('[Batch SaveToDatabase] No existing assetId, will create new entry with re-upload', {
        operationType,
        userId: user.id
      });
    }

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
        
        // Try unified save utility as fallback
        try {
          const { ensureAssetSaved } = await import('@/lib/saveAsset');
          const fallbackId = await ensureAssetSaved({
            imageUrl: '', // No image for analysis
            action: 'batch_analyze',
            prompt: analysisData?.full_regeneration_prompt || 'Batch analysis',
            sourceUrls: [sourceImage],
            params: {
              operation: 'analyze',
              batchItem: true
            },
            analysisData: analysisData,
            durationMs: duration,
            skipToast: true,
          });
          if (fallbackId) {
            console.log('[Batch SaveToDatabase] Analysis saved via unified utility fallback:', fallbackId);
            return fallbackId;
          }
        } catch (fallbackError) {
          console.error('[Batch SaveToDatabase] Unified utility fallback failed for analysis:', fallbackError);
        }
        
        throw dbError;
      }
      return assetData.id;
    }

    // For other operations, save the image
    console.log('[Batch SaveToDatabase] Starting image save', {
      operationType,
      imageDataUrlLength: imageDataUrl?.length || 0,
      imageDataUrlPrefix: imageDataUrl?.substring(0, 50) || 'none',
      userId: user.id
    });

    // Session already verified above, continue with blob conversion

    let blob: Blob;
    try {
      // Use fetch() for both data URLs and HTTP URLs - simpler and more reliable
      console.log('[Batch SaveToDatabase] Converting image to blob', {
        imageDataUrlType: imageDataUrl.startsWith('data:') ? 'data-url' : imageDataUrl.startsWith('http') ? 'http-url' : 'unknown',
        imageDataUrlPrefix: imageDataUrl.substring(0, 50),
        imageDataUrlLength: imageDataUrl.length
      });
      
      const response = await fetch(imageDataUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      blob = await response.blob();
      
      // CRITICAL: Validate blob exactly like Blend/Upscale do
      console.log('[Batch SaveToDatabase] Converted image to blob', {
        blobSize: blob.size,
        blobType: blob.type,
        responseStatus: response.status,
        contentType: response.headers.get('content-type'),
        blobConstructor: blob.constructor.name,
        blobIsBlob: blob instanceof Blob,
        blobIsFile: blob instanceof File
      });
      
      if (!blob) {
        console.error('[Batch SaveToDatabase] Blob is null or undefined');
        throw new Error('Image blob is null or undefined');
      }

      if (!(blob instanceof Blob)) {
        console.error('[Batch SaveToDatabase] Blob is not a Blob instance', {
          blobType: typeof blob,
          blobConstructor: (blob as any)?.constructor?.name
        });
        throw new Error('Image blob is not a valid Blob instance');
      }

      if (blob.size === 0) {
        console.error('[Batch SaveToDatabase] Blob size is zero', {
          blobType: blob.type,
          blobSize: blob.size
        });
        throw new Error('Image blob is empty (size is 0)');
      }

      // Validate MIME type
      if (!blob.type || (!blob.type.startsWith('image/') && blob.type !== 'application/octet-stream')) {
        console.warn('[Batch SaveToDatabase] Unexpected blob MIME type', {
          blobType: blob.type,
          blobSize: blob.size
        });
        // Don't throw - some browsers may not set MIME type correctly
      }
    } catch (fetchError) {
      console.error('[Batch SaveToDatabase] Failed to process image', {
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        imageDataUrlPrefix: imageDataUrl?.substring(0, 100),
        imageDataUrlType: imageDataUrl?.startsWith('data:') ? 'data-url' : imageDataUrl?.startsWith('http') ? 'http-url' : 'unknown',
        stack: fetchError instanceof Error ? fetchError.stack : undefined
      });
      throw new Error(`Failed to process image: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
    }
    
    // Generate filename EXACTLY like Blend/Upscale do
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uuid = crypto.randomUUID();
    // RLS policy requires first folder to be user ID - MUST match Blend/Upscale pattern
    let fileName = `${user.id}/batch/${yearMonth}/${uuid}.png`;
    
    // Validate filename format matches working tools
    if (!fileName.startsWith(user.id)) {
      console.error('[Batch SaveToDatabase] Invalid filename format - does not start with userId', {
        fileName,
        userId: user.id
      });
      throw new Error('Invalid filename format for storage upload');
    }

    console.log('[Batch SaveToDatabase] Prepared for storage upload', {
      fileName,
      fileNameLength: fileName.length,
      blobSize: blob.size,
      blobType: blob.type,
      userId: user.id,
      yearMonth,
      uuid,
      fileNameFormat: 'matches Blend/Upscale pattern'
    });
    
    // Final validation before upload - EXACTLY like Blend/Upscale
    if (!blob || !(blob instanceof Blob) || blob.size === 0) {
      console.error('[Batch SaveToDatabase] ❌ Invalid blob before upload', {
        blobExists: !!blob,
        blobIsBlob: blob instanceof Blob,
        blobSize: blob?.size || 0,
        blobType: blob?.type || 'unknown',
        fileName,
        userId: user.id
      });
      throw new Error('Failed to upload images: Invalid or empty image blob');
    }

    // Verify bucket name matches working tools
    const bucketName = 'generated-images';
    console.log('[Batch SaveToDatabase] Final pre-upload validation', {
      bucketName,
      fileName,
      blobSize: blob.size,
      blobType: blob.type,
      userId: user.id,
      fileNameStartsWithUserId: fileName.startsWith(user.id),
      fileNameEndsWithPng: fileName.endsWith('.png'),
      blobIsValid: blob instanceof Blob && blob.size > 0
    });
    
    // Retry upload up to 3 times
    let uploadError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[Batch SaveToDatabase] Upload attempt ${attempt + 1}/3`, {
          fileName,
          blobSize: blob.size,
          userId: user.id
        });
        
        // Verify session again before upload (may have expired during processing)
        const { data: { session: uploadSession }, error: uploadSessionError } = await supabase.auth.getSession();
        console.log(`[Batch SaveToDatabase] Pre-upload session check (attempt ${attempt + 1})`, {
          hasSession: !!uploadSession,
          hasAccessToken: !!uploadSession?.access_token,
          tokenLength: uploadSession?.access_token?.length || 0,
          sessionError: uploadSessionError?.message,
          userId: user.id
        });

        if (!uploadSession || !uploadSession.access_token) {
          const errorMsg = uploadSessionError?.message || 'Session expired';
          console.error(`[Batch SaveToDatabase] Invalid session before upload (attempt ${attempt + 1}):`, {
            error: errorMsg,
            userId: user.id
          });
          throw new Error(`Session expired. Please refresh and try again. (${errorMsg})`);
        }

        // Verify Supabase client is properly configured
        const supabaseUrl = (supabase as any).supabaseUrl || (supabase as any).rest?.url;
        console.log(`[Batch SaveToDatabase] Supabase client check (attempt ${attempt + 1})`, {
          hasSupabaseClient: !!supabase,
          supabaseUrl: supabaseUrl?.substring(0, 50) || 'unknown',
          hasStorage: !!supabase.storage,
          hasFrom: typeof supabase.storage?.from === 'function'
        });

        // Log full upload details before attempting
        console.log(`[Batch SaveToDatabase] About to call storage.upload (attempt ${attempt + 1})`, {
          bucket: 'generated-images',
          fileName,
          blobSize: blob.size,
          blobType: blob.type,
          contentType: 'image/png',
          userId: user.id,
          hasAccessToken: !!uploadSession.access_token,
          fileNameStartsWithUserId: fileName.startsWith(user.id),
          supabaseUrl: supabaseUrl?.substring(0, 50)
        });

        const uploadStartTime = Date.now();
        
        // CRITICAL: Log the exact call we're making (matches Blend/Upscale exactly)
        console.log(`[Batch SaveToDatabase] Making storage.upload call...`, {
          bucket: 'generated-images',
          fileName,
          options: {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          }
        });

        const { error, data } = await supabase.storage
          .from('generated-images')
          .upload(fileName, blob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });
        const uploadDuration = Date.now() - uploadStartTime;

        console.log(`[Batch SaveToDatabase] Storage upload call completed (attempt ${attempt + 1})`, {
          duration: uploadDuration,
          hasError: !!error,
          hasData: !!data,
          errorMessage: error?.message,
          errorName: error?.name,
          dataPath: data?.path,
          dataId: data?.id
        });

        if (!error) {
          uploadError = null;
          // Use the path from the upload response if available, otherwise use fileName
          const finalPath = data?.path || fileName;
          console.log('[Batch SaveToDatabase] Upload successful', {
            attempt: attempt + 1,
            fileName: finalPath,
            uploadData: data,
            path: data?.path
          });
          // Update fileName to the final path for public URL generation
          fileName = finalPath;
          break;
        }
        
        uploadError = error;
        
        // Log FULL error details including all properties
        const errorDetails: any = {
          message: error.message,
          name: error.name,
          fileName,
          userId: user.id,
          blobSize: blob.size,
          blobType: blob.type,
          bucket: 'generated-images',
          attempt: attempt + 1
        };

        // Try to extract all error properties
        try {
          errorDetails.fullErrorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
          errorDetails.errorKeys = Object.keys(error);
          if (error instanceof Error) {
            errorDetails.stack = error.stack;
          }
        } catch (stringifyError) {
          errorDetails.stringifyError = String(stringifyError);
        }

        console.error(`[Batch SaveToDatabase] ❌ Upload attempt ${attempt + 1} FAILED:`, errorDetails);
        
        // If this is a Supabase error, log the full response structure
        if (error && typeof error === 'object') {
          console.error(`[Batch SaveToDatabase] Error object structure:`, {
            constructor: error.constructor?.name,
            prototype: Object.getPrototypeOf(error)?.constructor?.name,
            ownProperties: Object.getOwnPropertyNames(error),
            enumerableProperties: Object.keys(error)
          });
        }
        
        // Check for specific error types and generate new filename if needed
        if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
          console.warn('[Batch SaveToDatabase] File already exists, trying with different name');
          // Generate new filename for retry
          fileName = `${user.id}/batch/${yearMonth}/${crypto.randomUUID()}.png`;
        }
        
        if (attempt < 2) {
          // Wait before retry with exponential backoff
          const delay = 1000 * Math.pow(2, attempt);
          console.log(`[Batch SaveToDatabase] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (uploadException) {
        uploadError = uploadException;
        console.error(`[Batch SaveToDatabase] Upload attempt ${attempt + 1} threw exception:`, {
          error: uploadException instanceof Error ? uploadException.message : String(uploadException),
          stack: uploadException instanceof Error ? uploadException.stack : undefined,
          fileName
        });
        
        if (attempt < 2) {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (uploadError) {
      console.error('[Batch SaveToDatabase] All upload attempts failed:', {
        error: uploadError.message,
        errorCode: uploadError.statusCode,
        fileName,
        userId: user.id,
        operationType,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to upload images: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    if (!publicUrl) {
      console.error('[Batch SaveToDatabase] Failed to get public URL', { 
        fileName,
        userId: user.id,
        operationType,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to upload images: Could not generate public URL');
    }

    console.log('[Batch SaveToDatabase] Got public URL', {
      fileName,
      publicUrl: publicUrl.substring(0, 100)
    });

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
      console.error('[Batch SaveToDatabase] Failed to save to database:', {
        error: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint,
        fileName,
        userId: user.id,
        operationType,
        timestamp: new Date().toISOString()
      });
      
      // Try unified save utility as final fallback
      console.warn('[Batch SaveToDatabase] Attempting unified save utility fallback');
      try {
        const { ensureAssetSaved } = await import('@/lib/saveAsset');
        const fallbackId = await ensureAssetSaved({
          imageUrl: publicUrl,
          action: `batch_${operationType}` as any,
          prompt: `Batch ${operationType} to ${size}`,
          sourceUrls: [sourceImage],
          params: {
            operation: operationType,
            targetSize: size,
            batchItem: true
          },
          durationMs: duration,
          skipToast: true,
        });
        if (fallbackId) {
          console.log('[Batch SaveToDatabase] Saved via unified utility fallback:', fallbackId);
          return fallbackId;
        }
      } catch (fallbackError) {
        console.error('[Batch SaveToDatabase] Unified utility fallback also failed:', fallbackError);
      }
      
      throw new Error(`Failed to upload images: Database save failed - ${dbError.message}`);
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

        const blendResult = await processBlend();
        const duration = Date.now() - itemStartTime;
        
        // Get original images as base64
        const originalImages = await Promise.all(
          queue.map(item => new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(item.file);
          }))
        );
        
        const result = blendResult.image;
        const assetId = await saveToDatabase(
          blendResult.image, 
          'blend', 
          'blended', 
          JSON.stringify(originalImages), 
          duration,
          undefined,
          blendResult.assetId
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
        const errorMsg = mapErrorMessage(error);
        console.error('[Batch Blend] Failed:', {
          error: errorMsg,
          errorDetails: error instanceof Error ? {
            message: error.message,
            stack: error.stack
          } : error,
          queueLength: queue.length,
          fileNames: queue.map(q => q.file.name)
        });
        
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
        let assetId: string | undefined;

        const reader = new FileReader();
        const originalBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(item.file);
        });

        if (operation === 'upscale') {
          const upscaleResult = await processUpscale(item);
          console.log(`[Batch] Upscale result received for item ${i}`, {
            hasImage: !!upscaleResult.image,
            hasAssetId: !!upscaleResult.assetId,
            imageType: upscaleResult.image?.startsWith('http') ? 'url' : upscaleResult.image?.startsWith('data:') ? 'data-url' : 'unknown',
            imageLength: upscaleResult.image?.length || 0
          });
          const duration = Date.now() - itemStartTime;
          result = upscaleResult.image; // Image URL from edge function
          console.log(`[Batch] Calling saveToDatabase for item ${i}`, {
            hasImage: !!result,
            hasAssetId: !!upscaleResult.assetId,
            willUseExistingAsset: !!upscaleResult.assetId
          });
          assetId = await saveToDatabase(upscaleResult.image, 'upscale', targetSize, originalBase64, duration, undefined, upscaleResult.assetId);
          console.log(`[Batch] saveToDatabase completed for item ${i}`, {
            returnedAssetId: assetId,
            hasResult: !!result
          });
        } else if (operation === 'analyze') {
          result = await processAnalyze(item);
          console.log(`[Batch] Analyze result received for item ${i}`, {
            resultType: typeof result,
            hasResult: !!result
          });
          const duration = Date.now() - itemStartTime;
          assetId = await saveToDatabase('', 'analyze', '', originalBase64, duration, result);
        } else if (operation === 'generate') {
          const generateResult = await processGenerate(item);
          console.log(`[Batch] Generate result received for item ${i}`, {
            hasImage: !!generateResult.image,
            hasAssetId: !!generateResult.assetId,
            imageType: generateResult.image?.startsWith('http') ? 'url' : generateResult.image?.startsWith('data:') ? 'data-url' : 'unknown',
            imageLength: generateResult.image?.length || 0
          });
          const duration = Date.now() - itemStartTime;
          result = generateResult.image; // Image URL from edge function
          console.log(`[Batch] Calling saveToDatabase for item ${i}`, {
            hasImage: !!result,
            hasAssetId: !!generateResult.assetId,
            willUseExistingAsset: !!generateResult.assetId
          });
          assetId = await saveToDatabase(generateResult.image, 'generate', '1024x1024', originalBase64, duration, undefined, generateResult.assetId);
          console.log(`[Batch] saveToDatabase completed for item ${i}`, {
            returnedAssetId: assetId,
            hasResult: !!result
          });
        }

        clearInterval(progressInterval);

        // CRITICAL: Log before marking as completed
        console.log(`[Batch] Marking item ${i} as completed`, {
          itemId: item.id,
          fileName: item.file.name,
          hasResult: !!result,
          resultType: typeof result,
          resultLength: result?.length || 0,
          hasAssetId: !!assetId,
          assetId: assetId
        });

        setQueue(prev => {
          const updated = prev.map((q, idx) => 
            idx === i 
              ? { ...q, status: 'completed' as const, progress: 100, result, assetId } 
              : q
          );
          
          // Log the updated state
          const completedItem = updated[i];
          console.log(`[Batch] Item ${i} state after update:`, {
            status: completedItem.status,
            hasResult: !!completedItem.result,
            hasAssetId: !!completedItem.assetId,
            progress: completedItem.progress
          });
          
          return updated;
        });

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        const errorMsg = mapErrorMessage(error);
        const detailedError = error instanceof Error ? error.message : String(error);
        
        console.error(`[Batch] Failed to process item ${i}:`, {
          itemId: item.id,
          fileName: item.file.name,
          operation,
          error: errorMsg,
          detailedError,
          errorDetails: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error,
          timestamp: new Date().toISOString()
        });
        
        // Show specific error toast for this item
        toast.error(`Failed to process ${item.file.name}`, {
          description: errorMsg,
          duration: 5000
        });
        
        setQueue(prev => prev.map((q, idx) => 
          idx === i 
            ? { ...q, status: 'failed', error: errorMsg } 
            : q
        ));
      }
    }

    if (!isPaused) {
      setIsProcessing(false);
      
      // Use a callback to get the current queue state
      setQueue(prev => {
        const completedCount = prev.filter(i => i.status === 'completed').length;
        const failedCount = prev.filter(i => i.status === 'failed').length;
        
        console.log('[Batch] Processing completed', {
          total: prev.length,
          completed: completedCount,
          failed: failedCount,
          operation,
          queueStatuses: prev.map(q => ({ id: q.id, status: q.status, fileName: q.file.name }))
        });
        
        if (failedCount > 0) {
          toast.error(`Batch processing completed with ${failedCount} failure(s)`, {
            description: `${completedCount} succeeded, ${failedCount} failed`,
            duration: 6000
          });
        } else if (completedCount > 0) {
          toast.success(`Batch processing completed! ${completedCount} of ${prev.length} items processed.`);
        } else {
          toast.error('Batch processing completed but no items were processed successfully.');
        }
        
        return prev;
      });
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
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
                  onClick={handleUploadClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleUploadClick();
                    }
                  }}
                  style={{ 
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple={operation !== 'blend'}
                    onChange={handleFileUpload}
                    className="sr-only"
                    id="batch-upload"
                    aria-label="Upload images"
                    style={{
                      position: 'absolute',
                      width: '1px',
                      height: '1px',
                      padding: 0,
                      margin: '-1px',
                      overflow: 'hidden',
                      clip: 'rect(0, 0, 0, 0)',
                      whiteSpace: 'nowrap',
                      borderWidth: 0
                    }}
                  />
                  <div className="min-h-[44px] flex flex-col items-center justify-center pointer-events-none">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {operation === 'blend' 
                        ? 'Tap to upload exactly 2 images' 
                        : 'Tap to add images (up to 10 total)'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports: JPG, PNG, WebP (max 15MB each)
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Bar */}
          {queue.length > 0 && (
            <div className="grid grid-cols-5 gap-2 overflow-x-auto">
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
    <div className="flex flex-wrap items-center gap-2 w-full">
      {!isProcessing && stats.completed > 0 && (
        <Button variant="outline" onClick={clearCompleted} className="min-h-[44px] touch-manipulation">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Completed
        </Button>
      )}

      {stats.completed > 0 && (
        <>
          <Button variant="outline" onClick={handleViewAll} className="min-h-[44px] touch-manipulation">
            <Eye className="w-4 h-4 mr-2" />
            View All Results
          </Button>
          <Button onClick={handleUseInStudio} className="min-h-[44px] touch-manipulation">
            <Wand2 className="w-4 h-4 mr-2" />
            Generate in Studio
          </Button>
        </>
      )}

      <div className="flex-1 min-w-[120px]" />

      {isProcessing && !isPaused && (
        <Button variant="outline" onClick={handlePause} className="min-h-[44px] touch-manipulation">
          <Pause className="w-4 h-4 mr-2" />
          Pause
        </Button>
      )}

      {!isProcessing && isPaused && stats.pending > 0 && (
        <Button onClick={handleResume} className="min-w-[140px] min-h-[44px] touch-manipulation">
          <Play className="w-4 h-4 mr-2" />
          Resume Processing
        </Button>
      )}

      {!isProcessing && !isPaused && (
        <Button
          onClick={processQueue}
          disabled={stats.pending === 0}
          className="min-w-[160px] min-h-[44px] touch-manipulation"
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
      contentClassName="pb-6 overflow-y-auto max-h-[calc(96dvh-200px)]"
      stickyFooterOnMobile={true}
      footer={footerContent}
    >
      {bodyContent}
    </ToolDrawer>
  );
};
