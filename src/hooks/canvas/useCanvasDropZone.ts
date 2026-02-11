import { useCallback, useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { supabase } from '@/integrations/supabase/client';
import type { ImageItemData } from '@/types/canvas';

export const useCanvasDropZone = () => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const uploadToStorage = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${userId}/canvas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        console.error('[Canvas] Upload error:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('generated-images')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('[Canvas] Upload failed:', err);
      return null;
    }
  };

  const handleDrop = useCallback(async (
    e: React.DragEvent,
    containerRect: DOMRect,
    screenToCanvas: (x: number, y: number, rect: DOMRect) => { x: number; y: number }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const state = useCanvasStore.getState();
    if (!state.currentCanvasId) return;

    // Calculate drop position in canvas coords
    const dropPos = screenToCanvas(e.clientX, e.clientY, containerRect);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blobUrl = URL.createObjectURL(file);

      // Load image to get natural dimensions
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = blobUrl;
      });

      const naturalWidth = img.naturalWidth || 400;
      const naturalHeight = img.naturalHeight || 300;

      // Scale to reasonable canvas size (max 400px wide)
      const maxWidth = 400;
      const scale = naturalWidth > maxWidth ? maxWidth / naturalWidth : 1;
      const displayWidth = naturalWidth * scale;
      const displayHeight = naturalHeight * scale;

      const itemData: ImageItemData = {
        url: blobUrl,
        uploading: true,
        fileName: file.name,
        fileSize: file.size,
        naturalWidth,
        naturalHeight,
      };

      // Add item at drop position (offset each subsequent image)
      const itemId = crypto.randomUUID();
      useCanvasStore.addItem({
        id: itemId,
        canvas_id: state.currentCanvasId,
        user_id: user.id,
        type: 'image',
        position_x: dropPos.x + i * 30,
        position_y: dropPos.y + i * 30,
        width: displayWidth,
        height: displayHeight,
        rotation: 0,
        z_index: state.items.length + i + 1,
        data: itemData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Upload in background
      uploadToStorage(file, user.id).then((permanentUrl) => {
        if (permanentUrl) {
          useCanvasStore.updateItem(itemId, {
            data: { ...itemData, url: permanentUrl, uploading: false },
          });
        } else {
          // Keep blob URL if upload fails
          useCanvasStore.updateItem(itemId, {
            data: { ...itemData, uploading: false },
          });
        }
        URL.revokeObjectURL(blobUrl);
      });
    }
  }, []);

  return {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
