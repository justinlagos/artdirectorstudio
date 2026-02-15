import React, { useState, useCallback, useEffect } from 'react';
import { mc } from '@/lib/microcopy';
import { COSTS } from '@/lib/costs';
import { useAuth } from '@/contexts/AuthContext';
import { useCanvasStore } from '@/store/canvasStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCreditReservation } from '@/hooks/useCreditReservation';
import { useEffectsPreview } from '@/hooks/useEffectsPreview';
import { useImageVersions } from '@/hooks/useImageVersions';
import { EFFECT_REGISTRY, EFFECT_CATEGORIES, getEffectsByCategory, getEffectDefinition } from '@/lib/effects/registry';
import { BUILT_IN_PRESETS } from '@/lib/effects/presets';
import { renderEffects } from '@/lib/effects/renderPipeline';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Eye, EyeOff, GripVertical, ChevronDown } from 'lucide-react';
import type { EffectLayer, ImageItemData } from '@/types/canvas';

interface EffectsDrawerProps {
  onRequestAuth?: () => void;
}

export const EffectsDrawer: React.FC<EffectsDrawerProps> = ({ onRequestAuth }) => {
  const { user } = useAuth();
  const selectedItemIds = useCanvasStore((s) => s.selectedItemIds);
  const items = useCanvasStore((s) => s.items);
  const stack = useWorkspaceStore((s) => s.effectsPreviewStack);
  const setStack = useWorkspaceStore((s) => s.setEffectsPreviewStack);
  const resetStack = useWorkspaceStore((s) => s.resetEffectsPreview);
  const addJob = useWorkspaceStore((s) => s.addJob);
  const updateJob = useWorkspaceStore((s) => s.updateJob);
  const { reserve, isReserving } = useCreditReservation();
  const { filterStyle, hasLaneBEffects } = useEffectsPreview();

  const [mode, setMode] = useState<'replace' | 'add'>('replace');
  const [isCommitting, setIsCommitting] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const selectedId = [...selectedItemIds][0];
  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId && !i.deleted_at && i.type === 'image')
    : null;
  const data = selectedItem?.data as ImageItemData | undefined;
  const { createVersion } = useImageVersions(selectedItem?.root_image_id);

  // Reset stack when item changes
  useEffect(() => {
    if (selectedItem && data?.effects_stack) {
      setStack(data.effects_stack as any[]);
    } else {
      resetStack();
    }
  }, [selectedItem?.id]);

  const toggleEffect = useCallback(
    (id: string) => {
      setStack(
        stack.map((l) =>
          l.id === id ? { ...l, enabled: !(l as any).enabled } as any : l
        )
      );
    },
    [stack, setStack]
  );

  const updateEffectParam = useCallback(
    (id: string, key: string, value: number | string | boolean) => {
      setStack(
        stack.map((l) =>
          l.id === id
            ? { ...l, params: { ...(l as any).params, [key]: value } } as any
            : l
        )
      );
    },
    [stack, setStack]
  );

  const removeEffect = useCallback(
    (id: string) => {
      setStack(stack.filter((l) => l.id !== id));
    },
    [stack, setStack]
  );

  const addEffect = useCallback(
    (type: string) => {
      const def = getEffectDefinition(type);
      if (!def) return;
      const newLayer: EffectLayer = {
        id: crypto.randomUUID(),
        type: def.type,
        lane: def.lane,
        enabled: true,
        order: stack.length,
        params: { ...def.defaultParams },
      };
      setStack([...stack, newLayer as any]);
      setShowAddMenu(false);
    },
    [stack, setStack]
  );

  const applyPreset = useCallback(
    (presetStack: EffectLayer[]) => {
      const cloned = presetStack.map((l) => ({
        ...l,
        id: crypto.randomUUID(),
      }));
      setStack(cloned as any[]);
      setShowPresets(false);
      toast.success(mc.toasts.success.presetApplied);
    },
    [setStack]
  );

  const handleSavePreset = async () => {
    if (!user || !presetName.trim()) return;
    try {
      await supabase.from('custom_generation_presets').insert({
        user_id: user.id,
        name: presetName.trim(),
        prompt_modifier: JSON.stringify(stack),
        options: { effects_stack: stack },
      });
      toast.success(mc.toasts.success.presetSaved);
      setShowSavePreset(false);
      setPresetName('');
    } catch {
      toast.error(mc.misc.presetSaveFailed);
    }
  };

  const handleCommit = async () => {
    if (!user) {
      onRequestAuth?.();
      return;
    }
    if (!selectedItem || !data) return;

    setIsCommitting(true);
    const jobId = crypto.randomUUID();

    try {
      if (hasLaneBEffects) {
        // Lane B: server-side, costs credits
        const result = await reserve(COSTS.effects_commit_server, 'effects_commit_server');
        if (!result.reserved) {
          toast.error(mc.toasts.errors.creditsInsufficient);
          setIsCommitting(false);
          return;
        }

        addJob({
          id: jobId,
          tab_id: selectedItem.canvas_id,
          item_id: selectedItem.id,
          root_image_id: selectedItem.root_image_id ?? null,
          source_version_id: selectedItem.image_version_id ?? null,
          reservation_id: result.reservationId,
          action: 'effects',
          expected_outputs: 1,
          status: 'running',
        });

        const { data: effectsResult, error } = await supabase.functions.invoke(
          'apply-effects',
          {
            body: {
              source_url: data.url,
              effects_stack: stack,
              reservation_id: result.reservationId,
            },
          }
        );

        if (error) throw error;

        const newUrl = effectsResult.url;
        const newVersion = await createVersion({
          root_image_id: selectedItem.root_image_id!,
          parent_version_id: selectedItem.image_version_id ?? null,
          storage_url: newUrl,
          thumbnail_url: effectsResult.thumbnail_url,
          source_action: 'effects',
          metadata: { effects_stack: stack },
        });

        if (mode === 'replace' && newVersion) {
          useCanvasStore.updateItemVersion(selectedItem.id, newVersion.id, newUrl);
          useCanvasStore.updateItem(selectedItem.id, {
            data: { ...data, url: newUrl, effects_stack: stack as EffectLayer[] } as ImageItemData,
          });
        }

        updateJob(jobId, { status: 'done' });
      } else {
        // Lane A only: free, client-side render
        addJob({
          id: jobId,
          tab_id: selectedItem.canvas_id,
          item_id: selectedItem.id,
          root_image_id: selectedItem.root_image_id ?? null,
          source_version_id: selectedItem.image_version_id ?? null,
          reservation_id: null,
          action: 'effects',
          expected_outputs: 1,
          status: 'running',
        });

        const blob = await renderEffects(data.url, stack as EffectLayer[]);

        // Upload
        const fileName = `${user.id}/effects/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
        const { error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(fileName, blob, { contentType: 'image/png', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(fileName);
        const newUrl = urlData.publicUrl;

        const newVersion = await createVersion({
          root_image_id: selectedItem.root_image_id!,
          parent_version_id: selectedItem.image_version_id ?? null,
          storage_url: newUrl,
          source_action: 'effects',
          metadata: { effects_stack: stack },
        });

        if (mode === 'replace' && newVersion) {
          useCanvasStore.updateItemVersion(selectedItem.id, newVersion.id, newUrl);
          useCanvasStore.updateItem(selectedItem.id, {
            data: { ...data, url: newUrl, effects_stack: stack as EffectLayer[] } as ImageItemData,
          });
        }

        updateJob(jobId, { status: 'done' });
      }

      resetStack();
      toast.success(mc.toasts.success.effectsCommitted);
    } catch (err) {
      console.error('[EffectsDrawer] commit error:', err);
      updateJob(jobId, { status: 'failed' });
      toast.error(mc.toasts.errors.networkEffects);
    } finally {
      setIsCommitting(false);
    }
  };

  if (!selectedItem) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center">
        <p className="text-sm font-medium text-white/50">{mc.workspace.empty.noSelection.title}</p>
        <p className="text-xs text-white/30 mt-1">{mc.workspace.empty.noSelection.body}</p>
      </div>
    );
  }

  const effectsByCategory = getEffectsByCategory();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Presets */}
        <div>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showPresets ? '' : '-rotate-90'}`} />
            Presets
          </button>
          {showPresets && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BUILT_IN_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.stack)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[10px] text-white/60 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Effects stack */}
        {stack.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-white/50">{mc.workspace.empty.effectsEmpty.title}</p>
            <p className="text-[10px] text-white/30 mt-1">{mc.workspace.empty.effectsEmpty.body}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stack.map((layer) => {
              const def = getEffectDefinition(layer.type);
              if (!def) return null;
              const typedLayer = layer as any;
              return (
                <div
                  key={layer.id}
                  className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3 h-3 text-white/20 cursor-grab" />
                    <button
                      onClick={() => toggleEffect(layer.id)}
                      className="text-white/40 hover:text-white/70"
                    >
                      {typedLayer.enabled ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="text-xs text-white/70 flex-1">{def.label}</span>
                    <span className="text-[9px] text-white/30 uppercase">
                      {def.lane === 'instant' ? 'A' : 'B'}
                    </span>
                    <button
                      onClick={() => removeEffect(layer.id)}
                      className="text-white/30 hover:text-red-400 text-xs"
                    >
                      ×
                    </button>
                  </div>
                  {typedLayer.enabled &&
                    def.controls.map((ctrl) => (
                      <div key={ctrl.key} className="flex items-center gap-2 pl-5">
                        <label className="text-[10px] text-white/40 w-14 shrink-0">
                          {ctrl.label}
                        </label>
                        {ctrl.type === 'slider' && (
                          <>
                            <input
                              type="range"
                              min={ctrl.min}
                              max={ctrl.max}
                              step={ctrl.step}
                              value={Number(typedLayer.params?.[ctrl.key] ?? ctrl.defaultValue)}
                              onChange={(e) =>
                                updateEffectParam(layer.id, ctrl.key, parseFloat(e.target.value))
                              }
                              className="flex-1 accent-[var(--sw-accent)] h-1"
                            />
                            <span className="text-[10px] text-white/40 tabular-nums w-8 text-right">
                              {Number(typedLayer.params?.[ctrl.key] ?? ctrl.defaultValue).toFixed(
                                (ctrl.step ?? 1) < 1 ? 2 : 0
                              )}
                            </span>
                          </>
                        )}
                        {ctrl.type === 'toggle' && (
                          <button
                            onClick={() =>
                              updateEffectParam(
                                layer.id,
                                ctrl.key,
                                !typedLayer.params?.[ctrl.key]
                              )
                            }
                            className={`px-2 py-0.5 text-[10px] rounded ${
                              typedLayer.params?.[ctrl.key]
                                ? 'bg-[var(--sw-accent-dim)] text-[var(--sw-accent)]'
                                : 'bg-white/5 text-white/40'
                            }`}
                          >
                            {typedLayer.params?.[ctrl.key] ? 'On' : 'Off'}
                          </button>
                        )}
                        {ctrl.type === 'select' && ctrl.options && (
                          <select
                            value={String(typedLayer.params?.[ctrl.key] ?? ctrl.defaultValue)}
                            onChange={(e) =>
                              updateEffectParam(layer.id, ctrl.key, e.target.value)
                            }
                            className="flex-1 bg-white/5 border border-white/10 text-white/70 text-[10px] rounded px-1 py-0.5"
                          >
                            {ctrl.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Add effect */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 transition-colors w-full"
          >
            <Plus className="w-3.5 h-3.5" /> Add Effect
          </button>
          {showAddMenu && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-neutral-900 border border-white/10 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {EFFECT_CATEGORIES.map((cat) => (
                <div key={cat}>
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/30 bg-white/5">
                    {cat}
                  </p>
                  {effectsByCategory[cat]?.map((def) => (
                    <button
                      key={def.type}
                      onClick={() => addEffect(def.type)}
                      className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 flex justify-between"
                    >
                      <span>{def.label}</span>
                      <span className="text-[9px] text-white/30">{def.lane === 'instant' ? 'Free' : 'Server'}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save preset */}
        {stack.length > 0 && (
          <div>
            {showSavePreset ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder={mc.misc.presetNamePlaceholder}
                  className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70 text-xs placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--sw-accent)]"
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className="px-2 py-1 text-xs bg-[var(--sw-accent)] text-white rounded disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSavePreset(false)}
                  className="px-2 py-1 text-xs text-white/40"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSavePreset(true)}
                className="text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                {mc.buttons.secondary.savePreset}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer: Replace/Add + Commit */}
      {stack.length > 0 && (
        <div className="shrink-0 p-4 border-t border-white/5 space-y-2">
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
          <button
            onClick={handleCommit}
            disabled={isCommitting || isReserving}
            className="w-full px-4 py-2.5 rounded-[var(--sw-radius-panel)] bg-[var(--sw-accent)] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {(isCommitting || isReserving) && <Loader2 className="w-4 h-4 animate-spin" />}
            {hasLaneBEffects
              ? `${mc.buttons.primary.commitCost} (cost: ${COSTS.effects_commit_server})`
              : mc.buttons.primary.commitFree}
          </button>
        </div>
      )}
    </div>
  );
};
