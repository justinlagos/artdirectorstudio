import React, { useState, useRef, useCallback } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { mc } from '@/lib/microcopy';
import { toast } from 'sonner';
import { Search, Upload, Loader2 } from 'lucide-react';
import { debugError } from '@/lib/debug';
import type { CanvasItem, ReferenceItemData } from '@/types/canvas';

export const ReferencesPanel: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const items = useCanvasStore((s) => s.items);
  const currentCanvasId = useCanvasStore((s) => s.currentCanvasId);
  const references = items.filter(
    (i) => i.type === 'reference' && !i.deleted_at && i.canvas_id === currentCanvasId
  );

  const filtered = search.trim()
    ? references.filter((r) => {
        const d = r.data as { label?: string; url?: string };
        const label = d?.label?.toLowerCase() ?? '';
        const url = d?.url?.toLowerCase() ?? '';
        const q = search.toLowerCase();
        return label.includes(q) || url.includes(q);
      })
    : references;

  const emptyState =
    references.length === 0
      ? mc.workspace.empty.referencesEmpty
      : filtered.length === 0
        ? mc.workspace.empty.searchNoMatches
        : null;

  const addReferenceItem = useCallback(
    (url: string, fileName?: string) => {
      if (!user || !currentCanvasId) return;

      const state = useCanvasStore.getState();
      const centerX = (-state.panX + 200) / state.zoom;
      const centerY = (-state.panY + 200) / state.zoom;

      const newItem: CanvasItem = {
        id: crypto.randomUUID(),
        canvas_id: currentCanvasId,
        user_id: user.id,
        type: 'reference',
        position_x: centerX,
        position_y: centerY,
        width: 200,
        height: 200,
        rotation: 0,
        z_index: state.items.length + 1,
        data: {
          url,
          thumbnailUrl: url,
          label: fileName ?? 'Reference',
        } as ReferenceItemData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      useCanvasStore.addItem(newItem);
      toast.success(mc.toasts.success.reference);
    },
    [user, currentCanvasId]
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

          const fileName = `${user.id}/references/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('[ReferencesPanel] upload error:', uploadError);
            debugError('references', {
              action: 'upload_error',
              message: uploadError.message,
              statusCode: (uploadError as any).statusCode,
            });
            toast.error(`Upload failed: ${uploadError.message}`);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('generated-images')
            .getPublicUrl(fileName);

          addReferenceItem(urlData.publicUrl, file.name);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [user, addReferenceItem]
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (!imageType) continue;

        const blob = await item.getType(imageType);
        const file = new File([blob], `paste-${Date.now()}.png`, { type: imageType });
        const dt = new DataTransfer();
        dt.items.add(file);
        await handleFileUpload(dt.files);
        return;
      }
      toast.error(mc.toasts.errors.boardPasteFailed);
    } catch {
      toast.error(mc.toasts.errors.boardPasteFailed);
    }
  }, [handleFileUpload]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      className="flex flex-col h-full bg-neutral-950 border-r border-white/5 overflow-hidden"
      style={{ width: 'var(--sw-references-width)' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="p-2 space-y-2 border-b border-white/5 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/5 rounded-[var(--sw-radius-panel)] border border-white/5 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-white/70 bg-white/5 hover:bg-white/10 rounded-[var(--sw-radius-panel)] transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Upload
          </button>
          <button
            onClick={handlePaste}
            className="flex-1 px-2 py-1.5 text-xs text-white/70 bg-white/5 hover:bg-white/10 rounded-[var(--sw-radius-panel)] transition-colors"
          >
            Paste
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      <div className="flex-1 overflow-y-auto p-2">
        {emptyState ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs font-medium text-white/50">
              {emptyState.title}
            </p>
            <p className="text-[10px] text-white/30 mt-1">
              {emptyState.body}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((ref) => {
              const data = ref.data as { url?: string; thumbnailUrl?: string };
              const src = data?.thumbnailUrl || data?.url;
              return (
                <div
                  key={ref.id}
                  className="aspect-square rounded-[var(--sw-radius-panel)] overflow-hidden bg-neutral-900"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', ref.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                >
                  {src && (
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
