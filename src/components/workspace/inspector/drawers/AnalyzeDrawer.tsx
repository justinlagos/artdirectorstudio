import React, { useState } from 'react';
import { mc } from '@/lib/microcopy';
import { COSTS } from '@/lib/costs';
import { useAuth } from '@/contexts/AuthContext';
import { useCanvasStore } from '@/store/canvasStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCreditReservation } from '@/hooks/useCreditReservation';
import { useImageVersions } from '@/hooks/useImageVersions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { debugLog, debugError } from '@/lib/debug';
import type { ImageItemData } from '@/types/canvas';

interface AnalyzeDrawerProps {
  onRequestAuth?: () => void;
}

const ANALYSIS_CATEGORIES = [
  'image_overview',
  'subject_description',
  'camera_composition',
  'lighting',
  'color_palette',
  'design_style',
  'texture_material',
  'mood_emotion',
  'background_environment',
  'artistic_medium',
  'art_direction_influence',
  'intended_use',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  image_overview: 'Image Overview',
  subject_description: 'Subject',
  camera_composition: 'Camera & Composition',
  lighting: 'Lighting',
  color_palette: 'Color Palette',
  design_style: 'Design Style',
  texture_material: 'Texture & Material',
  mood_emotion: 'Mood & Emotion',
  background_environment: 'Background',
  artistic_medium: 'Artistic Medium',
  art_direction_influence: 'Art Direction',
  intended_use: 'Intended Use',
};

export const AnalyzeDrawer: React.FC<AnalyzeDrawerProps> = ({ onRequestAuth }) => {
  const { user } = useAuth();
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);
  const items = useCanvasStore((s) => s.items);
  const { reserve, isReserving } = useCreditReservation();
  const addJob = useWorkspaceStore((s) => s.addJob);
  const updateJob = useWorkspaceStore((s) => s.updateJob);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedId = [...selectedItemIds][0];
  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId && !i.deleted_at && i.type === 'image')
    : null;
  const data = selectedItem?.data as ImageItemData | undefined;

  const { createVersion } = useImageVersions(selectedItem?.root_image_id);

  // No selection
  if (!selectedItem) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <p className="text-sm font-medium text-white/50">{mc.workspace.empty.noSelection.title}</p>
        <p className="text-xs text-white/30 mt-1">{mc.workspace.empty.noSelection.body}</p>
      </div>
    );
  }

  const hasAnalysis = !!data?.analysis_data;
  const analysis = data?.analysis_data as Record<string, unknown> | undefined;

  const handleAnalyze = async () => {
    if (!user) {
      onRequestAuth?.();
      return;
    }

    // Reserve credits
    const result = await reserve(COSTS.analyze, 'analyze');
    if (!result.reserved) {
      debugLog('analyze', {
        action: 'insufficient_credits',
        available: result.available,
        required: result.required,
      });
      toast.error(`Insufficient credits: ${result.available} available, ${result.required} needed`);
      return;
    }

    const { reservationId, commit, refund } = result;

    // Add job
    const jobId = crypto.randomUUID();
    addJob({
      id: jobId,
      tab_id: selectedItem.canvas_id,
      item_id: selectedItem.id,
      root_image_id: selectedItem.root_image_id ?? null,
      source_version_id: selectedItem.image_version_id ?? null,
      reservation_id: reservationId,
      action: 'analyze',
      expected_outputs: 1,
      status: 'running',
    });

    setIsAnalyzing(true);

    try {
      const { data: analysisResult, error } = await supabase.functions.invoke(
        'analyze-image',
        { body: { image: data?.url, reservation_id: reservationId } }
      );

      if (error) {
        // supabase.functions.invoke wraps the response — try to extract body
        debugError('analyze', {
          action: 'invoke_error',
          message: error.message,
          context: error.context,
        });
        throw error;
      }

      // Edge function may return an error in the JSON body (non-2xx)
      if (analysisResult?.error || analysisResult?.errorCode) {
        const errMsg = analysisResult.error || 'Unknown error';
        const errCode = analysisResult.errorCode || 'unknown';
        debugError('analyze', { action: 'edge_fn_error', errMsg, errCode });
        throw new Error(`${errCode}: ${errMsg}`);
      }

      // Store analysis on item
      useCanvasStore.updateItem(selectedItem.id, {
        data: {
          ...selectedItem.data,
          analysis_data: analysisResult.analysis,
          locked_description: analysisResult.full_regeneration_prompt,
        } as ImageItemData,
      });

      // Create version record if this is first analysis
      if (selectedItem.root_image_id) {
        await createVersion({
          root_image_id: selectedItem.root_image_id,
          parent_version_id: selectedItem.image_version_id ?? null,
          storage_url: data?.url ?? '',
          source_action: 'analyze',
          metadata: { analysis: analysisResult.analysis },
        });
      }

      updateJob(jobId, { status: 'done' });
      toast.success(mc.toasts.success.analyze);
    } catch (err: any) {
      console.error('[AnalyzeDrawer] error:', err);
      await refund().catch(() => {});
      updateJob(jobId, { status: 'failed' });

      // Show meaningful error to user
      const msg = err?.message || 'Unknown error';
      if (msg.includes('invalid_reservation') || msg.includes('402')) {
        toast.error('Reservation expired or invalid. Credits were not charged.');
      } else if (msg.includes('parse_error')) {
        toast.error('AI returned unexpected format. Credits refunded. Please try again.');
      } else if (msg.includes('config_error')) {
        toast.error('AI service not configured. Contact support.');
      } else if (msg.includes('429') || msg.includes('rate_limit')) {
        toast.error('Rate limited. Please wait a moment and try again.');
      } else {
        toast.error(`Analysis failed: ${msg.substring(0, 100)}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Not analyzed yet — show nudge
  if (!hasAnalysis) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <p className="text-sm font-medium text-white/70">
          {mc.workspace.firstImage.nudge.title}
        </p>
        <p className="text-xs text-white/40 mt-1 mb-4">
          {mc.workspace.firstImage.nudge.body}
        </p>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || isReserving}
          className="px-4 py-2.5 rounded-[var(--sw-radius-panel)] bg-[var(--sw-accent)] text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
        >
          {(isAnalyzing || isReserving) && <Loader2 className="w-4 h-4 animate-spin" />}
          {mc.buttons.primary.analyze} (cost: {COSTS.analyze})
        </button>
      </div>
    );
  }

  // Show analysis feedback cards
  return (
    <div className="p-4 space-y-3 overflow-y-auto">
      {/* Locked description */}
      {data?.locked_description && (
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
            Full Regeneration Prompt
          </p>
          <p className="text-xs text-white/70 leading-relaxed">
            {data.locked_description}
          </p>
        </div>
      )}

      {/* 12 category cards */}
      <div className="space-y-2">
        {ANALYSIS_CATEGORIES.map((cat) => {
          const value = analysis?.[cat];
          if (!value) return null;
          return (
            <div key={cat} className="p-3 rounded-lg bg-white/5 border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-[var(--sw-accent)] mb-1">
                {CATEGORY_LABELS[cat]}
              </p>
              <p className="text-xs text-white/60 leading-relaxed">
                {String(value)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Re-analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing || isReserving}
        className="w-full px-4 py-2 rounded-[var(--sw-radius-panel)] bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {(isAnalyzing || isReserving) && <Loader2 className="w-4 h-4 animate-spin" />}
        Re-analyze (cost: {COSTS.analyze})
      </button>
    </div>
  );
};
