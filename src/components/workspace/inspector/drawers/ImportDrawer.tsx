import React, { useState, useCallback, useRef } from 'react';
import { mc } from '@/lib/microcopy';
import { useAuth } from '@/contexts/AuthContext';
import { useCanvasStore } from '@/store/canvasStore';
import { useImageVersions } from '@/hooks/useImageVersions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Link, Loader2 } from 'lucide-react';
import type { CanvasItem, ImageItemData } from '@/types/canvas';

export const ImportDrawer: React.FC = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createVersion } = useImageVersions(null);

  const importImage = useCallback(
    async (url: string, fileName?: string) => {
      if (!user) return;

      const rootImageId = crypto.randomUUID();

      // Create image_version record
      const { data: versionRow, error: versionError } = await supabase
        .from('image_versions')
        .insert({
          root_image_id: rootImageId,
          storage_url: url,
          thumbnail_url: url,
          source_action: 'import',
          created_by: user.id,
          metadata: { fileName },
        })
        .select()
        .single();

      if (versionError) {
        console.error('[ImportDrawer] version create error:', versionError);
      }

      // Create canvas item at viewport center
      const state = useCanvasStore.getState();
      const centerX = (-state.panX + 400) / state.zoom;
      const centerY = (-state.panY + 300) / state.zoom;

      const newItem: CanvasItem = {
        id: crypto.randomUUID(),
        canvas_id: state.currentCanvasId!,
        user_id: user.id,
        type: 'image',
        position_x: centerX - 150,
        position_y: centerY - 150,
        width: 300,
        height: 300,
        rotation: 0,
        z_index: state.items.length + 1,
        data: {
          url,
          fileName: fileName ?? mc.misc.importedImage,
        } as ImageItemData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        image_version_id: versionRow?.id ?? null,
        root_image_id: rootImageId,
      };

      useCanvasStore.addItem(newItem);
      useCanvasStore.selectItem(newItem.id);
      toast.success(mc.toasts.success.upload);
    },
    [user]
  );

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !user) return;

      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith('image/')) {
            toast.error(mc.toasts.errors.boardUnsupportedFile);
            continue;
          }

          const fileName = `${user.id}/imports/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('[ImportDrawer] upload error:', uploadError);
            toast.error(mc.toasts.errors.networkUpload);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('generated-images')
            .getPublicUrl(fileName);

          await importImage(urlData.publicUrl, file.name);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [user, importImage]
  );

  const handleUrlImport = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error(mc.misc.enterValidUrl);
      return;
    }

    setIsUploading(true);
    try {
      await importImage(url, 'URL import');
      setUrlInput('');
    } catch {
      toast.error(mc.toasts.errors.networkUpload);
    } finally {
      setIsUploading(false);
    }
  }, [urlInput, importImage]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="p-4 space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-lg hover:border-white/20 hover:bg-white/5 transition-colors cursor-pointer"
      >
        {isUploading ? (
          <Loader2 className="w-8 h-8 text-white/40 animate-spin mb-2" />
        ) : (
          <Upload className="w-8 h-8 text-white/30 mb-2" />
        )}
        <p className="text-sm text-white/60 font-medium">
          {isUploading ? mc.progress.uploading : mc.misc.dropOrClick}
        </p>
        <p className="text-[10px] text-white/30 mt-1">{mc.misc.supportedFormats}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-white/30">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* URL paste */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <Link className="w-3.5 h-3.5 text-white/30 shrink-0" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste image URL"
            className="flex-1 bg-transparent text-white/70 text-sm placeholder:text-white/30 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
          />
        </div>
        <button
          onClick={handleUrlImport}
          disabled={!urlInput.trim() || isUploading}
          className="px-3 py-2 rounded-lg bg-[var(--sw-accent)] text-white text-sm font-medium disabled:opacity-50"
        >
          Import
        </button>
      </div>

      <p className="text-[10px] text-white/30 text-center">
        No credits required for import.
      </p>
    </div>
  );
};
