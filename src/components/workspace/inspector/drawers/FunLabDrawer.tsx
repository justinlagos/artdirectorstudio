import React, { useState, useCallback, useRef } from 'react';
import { mc } from '@/lib/microcopy';
import { COSTS } from '@/lib/costs';
import { useAuth } from '@/contexts/AuthContext';
import { useCanvasStore } from '@/store/canvasStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCreditReservation } from '@/hooks/useCreditReservation';
import { useImageVersions } from '@/hooks/useImageVersions';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { interpolateTemplate, type FunLabPack } from '@/lib/funlab/packs';
import { PackBrowser } from '@/components/workspace/funlab/PackBrowser';
import { PackOptions } from '@/components/workspace/funlab/PackOptions';
import { ResultTiles, type FunLabResult } from '@/components/workspace/funlab/ResultTiles';
import type { ImageItemData, CanvasItem } from '@/types/canvas';

interface FunLabDrawerProps {
  onRequestAuth?: () => void;
}

export const FunLabDrawer: React.FC<FunLabDrawerProps> = ({ onRequestAuth }) => {
  const { user } = useAuth();
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);
  const items = useCanvasStore((s) => s.items);
  const { reserve, isReserving } = useCreditReservation();
  const addJob = useWorkspaceStore((s) => s.addJob);
  const updateJob = useWorkspaceStore((s) => s.updateJob);
  const jobs = useWorkspaceStore((s) => s.jobs);
  const { balance } = useCredits();

  const [selectedPack, setSelectedPack] = useState<FunLabPack | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<FunLabResult[] | null>(null);
  const [mode, setMode] = useState<'replace' | 'add'>('add');

  const selectedId = [...selectedItemIds][0];
  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId && !i.deleted_at && i.type === 'image')
    : null;
  const data = selectedItem?.data as ImageItemData | undefined;

  const { createVersion } = useImageVersions(selectedItem?.root_image_id);

  // Guard: rapid-click prevention for same item
  const isJobRunning = selectedItem
    ? jobs.some(
        (j) =>
          j.item_id === selectedItem.id &&
          j.action === 'funlab' &&
          (j.status === 'running' || j.status === 'pending')
      )
    : false;

  // No working image selected
  if (!selectedItem) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <p className="text-sm font-medium text-white/50">
          {mc.workspace.empty.funLabNoSelection.title}
        </p>
        <p className="text-xs text-white/30 mt-1">
          {mc.workspace.empty.funLabNoSelection.body}
        </p>
      </div>
    );
  }

  // Reference selected guard
  if (selectedItem.type !== 'image') {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <p className="text-sm font-medium text-white/50">
          {mc.inspector.itemContext.cannotApplyToolsToReference}
        </p>
      </div>
    );
  }

  // Results display after generation completes
  if (results && results.length > 0) {
    return (
      <div className="p-4 flex flex-col h-full">
        <p className="text-sm font-medium text-white/80 mb-2">
          {mc.toasts.success.funLabReady}
        </p>
        <p className="text-xs text-white/40 mb-4">
          Tap an option to commit it. Others will collapse into a chip.
        </p>

        {/* Replace / Add toggle */}
        <div className="flex items-center gap-2 mb-4">
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

        {/* Mini tile previews in drawer */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleCommitResult(r)}
              className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all"
            >
              <img src={r.thumbnail_url || r.url} alt={`Option ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setResults(null);
            setSelectedPack(null);
          }}
          className="w-full px-4 py-2 rounded-[var(--sw-radius-panel)] bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
        >
          {mc.buttons.secondary.retry}
        </button>
      </div>
    );
  }

  async function handleGenerate(controlValues: Record<string, string | number>) {
    if (!user) {
      onRequestAuth?.();
      return;
    }

    if (!selectedItem || isJobRunning) return;

    // Reserve credits
    const result = await reserve(COSTS.funlab_3_options, 'funlab_3_options', `Fun Lab: ${selectedPack?.name}`);
    if (!result.reserved) {
      toast.error(mc.toasts.errors.creditsInsufficient);
      return;
    }

    const { reservationId, commit, refund } = result;

    // Build prompts from templates
    const lockedDesc = data?.locked_description || 'a portrait photograph';
    const userText = String(controlValues['user_text'] || '');
    const textStyle = String(controlValues['text_style'] || 'modern_sans');
    const density = String(controlValues['density'] || '0.6');
    const contrast = String(controlValues['contrast'] || '0.7');
    const textScale = String(controlValues['text_scale'] || '1.0');
    const mappingMode = String(controlValues['mapping_mode'] || 'edge_emphasis');

    const variantPrompts = selectedPack!.prompt_templates.map((tpl) =>
      interpolateTemplate(tpl, {
        image_description: lockedDesc,
        user_text: userText,
        text_style: textStyle,
        density,
        contrast,
        text_scale: textScale,
        mapping_mode: mappingMode,
      })
    ) as [string, string, string];

    // Add job
    const jobId = crypto.randomUUID();
    addJob({
      id: jobId,
      tab_id: selectedItem.canvas_id,
      item_id: selectedItem.id,
      root_image_id: selectedItem.root_image_id ?? null,
      source_version_id: selectedItem.image_version_id ?? null,
      reservation_id: reservationId,
      action: 'funlab',
      expected_outputs: 3,
      status: 'running',
    });

    setIsGenerating(true);

    try {
      const { data: genResult, error: genError } = await supabase.functions.invoke(
        'funlab-generate',
        {
          body: {
            pack_id: selectedPack!.id,
            variant_prompts: variantPrompts,
            source_image_url: data?.url,
            pack_controls: controlValues,
            reservation_id: reservationId,
          },
        }
      );

      if (genError) throw genError;
      if (!genResult?.results || genResult.results.length === 0) {
        throw new Error('No results returned');
      }

      // Commit credits
      await commit();

      // Create image_version records for each result
      const versionedResults: FunLabResult[] = [];
      for (const res of genResult.results) {
        const version = await createVersion({
          root_image_id: selectedItem.root_image_id!,
          parent_version_id: selectedItem.image_version_id ?? null,
          storage_url: res.url,
          thumbnail_url: res.thumbnail_url,
          source_action: 'funlab',
          metadata: { pack_id: selectedPack!.id },
        });

        versionedResults.push({
          url: res.url,
          thumbnail_url: res.thumbnail_url,
          version_id: version?.id,
        });
      }

      setResults(versionedResults);
      updateJob(jobId, { status: 'done' });
      toast.success(mc.toasts.success.funLabReady);
    } catch (err) {
      console.error('[FunLabDrawer] error:', err);
      await refund().catch(() => {});
      updateJob(jobId, { status: 'failed' });
      toast.error(mc.toasts.errors.networkFunLab);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCommitResult(result: FunLabResult) {
    if (!selectedItem || !user) return;

    if (mode === 'replace') {
      if (result.version_id) {
        useCanvasStore.updateItemVersion(selectedItem.id, result.version_id, result.url);
      } else {
        useCanvasStore.updateItem(selectedItem.id, {
          data: { ...selectedItem.data, url: result.url } as ImageItemData,
        });
      }
    } else {
      // Add mode: create new canvas item
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
          url: result.url,
          locked_description: data?.locked_description,
          analysis_data: data?.analysis_data,
        } as ImageItemData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        image_version_id: result.version_id ?? null,
        root_image_id: selectedItem.root_image_id,
      };
      useCanvasStore.addItem(newItem);
    }

    toast.success(mc.toasts.success.funLabCommitted);
    // Clear results after commit - user can generate again
    setResults(null);
    setSelectedPack(null);
  }

  // Pack selected → show options
  if (selectedPack) {
    return (
      <PackOptions
        pack={selectedPack}
        imageUrl={data?.url}
        onBack={() => setSelectedPack(null)}
        onGenerate={handleGenerate}
        isGenerating={isGenerating || isJobRunning}
        isReserving={isReserving}
        creditsAvailable={balance ?? 0}
      />
    );
  }

  // Default: pack browser
  return <PackBrowser onSelectPack={setSelectedPack} />;
};
