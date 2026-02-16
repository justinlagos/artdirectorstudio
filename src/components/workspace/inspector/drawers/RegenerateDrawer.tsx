import React, { useState } from 'react';
import { mc } from '@/lib/microcopy';
import { COSTS } from '@/lib/costs';
import { PROMPT_CHIPS } from '@/lib/prompt/chips';
import { useAuth } from '@/contexts/AuthContext';
import { useCanvasStore } from '@/store/canvasStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCreditReservation } from '@/hooks/useCreditReservation';
import { usePromptSystem } from '@/hooks/usePromptSystem';
import { useImageVersions } from '@/hooks/useImageVersions';
import { supabase } from '@/integrations/supabase/client';
import { parseEdgeFunctionError } from '@/lib/edgeFunctionErrors';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { ImageItemData, CanvasItem } from '@/types/canvas';

interface RegenerateDrawerProps {
  onRequestAuth?: () => void;
  onSwitchToAnalyze?: () => void;
}

export const RegenerateDrawer: React.FC<RegenerateDrawerProps> = ({
  onRequestAuth,
  onSwitchToAnalyze,
}) => {
  const { user } = useAuth();
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);
  const items = useCanvasStore((s) => s.items);
  const { reserve, isReserving } = useCreditReservation();
  const addJob = useWorkspaceStore((s) => s.addJob);
  const updateJob = useWorkspaceStore((s) => s.updateJob);

  const selectedId = [...selectedItemIds][0];
  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId && !i.deleted_at && i.type === 'image')
    : null;
  const data = selectedItem?.data as ImageItemData | undefined;

  const {
    lockedDescription,
    editableDirection,
    setEditableDirection,
    isReady,
  } = usePromptSystem(selectedItem?.id ?? null);

  const { createVersion } = useImageVersions(selectedItem?.root_image_id);

  const [mode, setMode] = useState<'replace' | 'add'>('replace');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLocked, setShowLocked] = useState(false);

  // No selection
  if (!selectedItem) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <p className="text-sm font-medium text-white/50">{mc.workspace.empty.noSelection.title}</p>
        <p className="text-xs text-white/30 mt-1">{mc.workspace.empty.noSelection.body}</p>
      </div>
    );
  }

  // Not analyzed yet
  if (!isReady) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <p className="text-sm font-medium text-white/50">
          {mc.workspace.empty.analyzeBeforeFirst.title}
        </p>
        <p className="text-xs text-white/30 mt-1 mb-4">
          {mc.workspace.empty.analyzeBeforeFirst.body}
        </p>
        {onSwitchToAnalyze && (
          <button
            onClick={onSwitchToAnalyze}
            className="px-4 py-2 rounded-[var(--sw-radius-panel)] bg-white/10 hover:bg-white/15 text-white/70 text-sm font-medium transition-colors"
          >
            Go to Analyze
          </button>
        )}
      </div>
    );
  }

  const handleRegenerate = async () => {
    if (!user) {
      onRequestAuth?.();
      return;
    }

    const result = await reserve(COSTS.regenerate, 'regenerate');
    if (!result.reserved) {
      toast.error(mc.toasts.errors.creditsInsufficient);
      return;
    }

    const { reservationId, commit, refund } = result;
    const jobId = crypto.randomUUID();
    addJob({
      id: jobId,
      tab_id: selectedItem.canvas_id,
      item_id: selectedItem.id,
      root_image_id: selectedItem.root_image_id ?? null,
      source_version_id: selectedItem.image_version_id ?? null,
      reservation_id: reservationId,
      action: 'regenerate',
      expected_outputs: 1,
      status: 'running',
    });

    setIsGenerating(true);
    toast.info(mc.toasts.success.regenerateStarted);

    try {
      // Step 1: Regenerate prompt
      const { data: promptResult, error: promptError } = await supabase.functions.invoke(
        'regenerate-prompt',
        {
          body: {
            base_analysis: data?.analysis_data ?? {},
            user_edits: { direction: editableDirection },
            reservation_id: reservationId,
          },
        }
      );
      if (promptError) throw promptError;

      // Step 2: Generate image (standard request)
      const { data: genResult, error: genError } = await supabase.functions.invoke(
        'generate-image',
        {
          body: {
            prompt: promptResult.full_regeneration_prompt,
            reservation_id: reservationId,
          },
        }
      );
      if (genError) throw genError;

      const newUrl = genResult.image;

      // Create new version
      const newVersion = await createVersion({
        root_image_id: selectedItem.root_image_id!,
        parent_version_id: selectedItem.image_version_id ?? null,
        storage_url: newUrl,
        source_action: 'regenerate',
        metadata: { prompt: promptResult.full_regeneration_prompt },
      });

      if (mode === 'replace') {
        // Replace mode: update the same item
        if (newVersion) {
          useCanvasStore.updateItemVersion(selectedItem.id, newVersion.id, newUrl);
        } else {
          useCanvasStore.updateItem(selectedItem.id, {
            data: { ...selectedItem.data, url: newUrl } as ImageItemData,
          });
        }
      } else {
        // Add mode: create new canvas item offset
        const newItem: CanvasItem = {
          id: crypto.randomUUID(),
          canvas_id: selectedItem.canvas_id,
          user_id: user.id,
          type: 'image',
          position_x: selectedItem.position_x + 20,
          position_y: selectedItem.position_y + 20,
          width: selectedItem.width,
          height: selectedItem.height,
          rotation: 0,
          z_index: selectedItem.z_index + 1,
          data: {
            url: newUrl,
            locked_description: promptResult.full_regeneration_prompt,
            analysis_data: data?.analysis_data,
          } as ImageItemData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          image_version_id: newVersion?.id ?? null,
          root_image_id: selectedItem.root_image_id,
        };
        useCanvasStore.addItem(newItem);
      }

      updateJob(jobId, { status: 'done' });
      toast.success(mc.toasts.success.regenerateComplete);
    } catch (err) {
      console.error('[RegenerateDrawer] error:', err);
      await refund().catch(() => {});
      updateJob(jobId, { status: 'failed' });
      const parsed = await parseEdgeFunctionError(err);
      const message =
        parsed.message && parsed.message !== 'Edge Function returned a non-2xx status code'
          ? parsed.message
          : mc.toasts.errors.networkRegenerate;
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 space-y-3 overflow-y-auto">
      {/* Locked description (collapsible) */}
      <button
        onClick={() => setShowLocked(!showLocked)}
        className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70 transition-colors w-full"
      >
        {showLocked ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Locked Description
      </button>
      {showLocked && (
        <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-xs text-white/50 leading-relaxed">
          {lockedDescription || mc.misc.noDescriptionAvailable}
        </div>
      )}

      {/* Editable direction */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">
          Direction
        </label>
        <textarea
          value={editableDirection}
          onChange={(e) => setEditableDirection(e.target.value)}
          placeholder={mc.workspace.empty.promptPlaceholder}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--sw-accent)] resize-none"
          rows={3}
        />
      </div>

      {/* Prompt chips */}
      <div className="flex flex-wrap gap-1.5">
        {PROMPT_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() =>
              setEditableDirection(
                editableDirection ? `${editableDirection} ${chip.fragment}` : chip.fragment
              )
            }
            className="px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[10px] text-white/60 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Replace / Add toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('replace')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            mode === 'replace'
              ? 'bg-[var(--sw-accent-dim)] text-[var(--sw-accent)]'
              : 'bg-white/5 text-white/40 hover:text-white/60'
          }`}
        >
          Replace
        </button>
        <button
          onClick={() => setMode('add')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            mode === 'add'
              ? 'bg-[var(--sw-accent-dim)] text-[var(--sw-accent)]'
              : 'bg-white/5 text-white/40 hover:text-white/60'
          }`}
        >
          Add
        </button>
      </div>

      {/* Regenerate button */}
      <button
        onClick={handleRegenerate}
        disabled={isGenerating || isReserving}
        className="w-full px-4 py-2.5 rounded-[var(--sw-radius-panel)] bg-[var(--sw-accent)] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {(isGenerating || isReserving) && <Loader2 className="w-4 h-4 animate-spin" />}
        {mc.buttons.primary.regenerate} (cost: {COSTS.regenerate})
      </button>
    </div>
  );
};
