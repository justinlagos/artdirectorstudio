import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, X, Undo2, Redo2, Loader2, LogOut } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CreditsDisplay } from './CreditsDisplay';
import { mc } from '@/lib/microcopy';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TabsBarProps {
  onCreateCanvas: () => void;
  onSwitchCanvas: (canvasId: string) => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({
  onCreateCanvas,
  onSwitchCanvas,
}) => {
  const { signOut } = useAuth();
  const canvases = useCanvasStore((s) => s.canvases);
  const currentCanvasId = useCanvasStore((s) => s.currentCanvasId);
  const undoStack = useCanvasStore((s) => s.undoStack);
  const redoStack = useCanvasStore((s) => s.redoStack);
  const items = useCanvasStore((s) => s.items);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const jobs = useWorkspaceStore((s) => s.jobs);
  const tabBadges = useWorkspaceStore((s) => s.tabBadges);

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const activeCanvases = canvases.filter((c) => !c.deleted_at);

  const getFirstItemThumbnail = (canvasId: string) => {
    const firstItem = items.find(
      (i) => i.canvas_id === canvasId && !i.deleted_at && i.type === 'image'
    );
    if (!firstItem) return null;
    const data = firstItem.data as { thumbnailUrl?: string; url?: string };
    return data?.thumbnailUrl || data?.url;
  };

  const startEditing = useCallback((canvasId: string, currentName: string) => {
    setEditingTabId(canvasId);
    setEditingName(currentName);
  }, []);

  const commitRename = useCallback(async () => {
    if (!editingTabId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingTabId(null);
      return;
    }

    // Update local store
    const state = useCanvasStore.getState();
    const updatedCanvases = state.canvases.map((c) =>
      c.id === editingTabId ? { ...c, name: trimmed } : c
    );
    useCanvasStore.setCanvases(updatedCanvases);

    // Persist to DB
    await supabase
      .from('canvases')
      .update({ name: trimmed })
      .eq('id', editingTabId);

    setEditingTabId(null);
  }, [editingTabId, editingName]);

  const cancelEditing = useCallback(() => {
    setEditingTabId(null);
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTabId]);

  return (
    <div
      className="flex items-center justify-between px-3 border-b border-white/5 bg-neutral-950"
      style={{ height: 'var(--sw-tabs-height)' }}
    >
      {/* Left: tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
        {activeCanvases.map((canvas) => {
          const isActive = canvas.id === currentCanvasId;
          const thumb = getFirstItemThumbnail(canvas.id);
          const isEditing = editingTabId === canvas.id;

          return (
            <button
              key={canvas.id}
              onClick={() => !isEditing && onSwitchCanvas(canvas.id)}
              onDoubleClick={() => startEditing(canvas.id, canvas.name)}
              className={`
                flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-t-md
                transition-colors duration-150 whitespace-nowrap min-w-0
                group
                ${
                  isActive
                    ? 'bg-neutral-900 text-white/90 border-t border-x border-white/10'
                    : 'text-white/40 hover:text-white/60 hover:bg-neutral-900/50'
                }
              `}
              title={mc.tooltips.tabs}
            >
              {thumb ? (
                <div className="w-5 h-5 rounded overflow-hidden bg-neutral-800 shrink-0">
                  <img
                    src={thumb}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-5 h-5 rounded bg-neutral-800/50 shrink-0" />
              )}
              {isEditing ? (
                <input
                  ref={editInputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  onBlur={commitRename}
                  onClick={(e) => e.stopPropagation()}
                  className="w-[80px] bg-transparent border-b border-white/30 text-xs text-white/90 focus:outline-none focus:border-[var(--sw-accent)]"
                />
              ) : (
                <span className="truncate max-w-[100px]">{canvas.name}</span>
              )}
              {isDirty && isActive && !isEditing && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              )}
              {jobs.some((j) => j.tab_id === canvas.id && (j.status === 'running' || j.status === 'pending')) && (
                <Loader2 className="w-3 h-3 text-[var(--sw-accent)] animate-spin shrink-0" />
              )}
              {!isActive && tabBadges[canvas.id] && tabBadges[canvas.id] > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--sw-accent)] text-[9px] text-white font-bold shrink-0">
                  {mc.tabs.newResult(tabBadges[canvas.id])}
                </span>
              )}
              {activeCanvases.length > 1 && isActive && !isEditing && (
                <X
                  className="w-3 h-3 text-white/30 hover:text-white/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeCanvases.length <= 1) return;
                    const hasRunningJob = jobs.some(
                      (j) => j.tab_id === canvas.id && (j.status === 'running' || j.status === 'pending')
                    );
                    const closeTab = async () => {
                      // Switch to another tab first if closing the active one
                      const remaining = activeCanvases.filter((c) => c.id !== canvas.id);
                      if (canvas.id === currentCanvasId && remaining.length > 0) {
                        onSwitchCanvas(remaining[0].id);
                      }
                      useCanvasStore.removeCanvas(canvas.id);
                      // Soft-delete in Supabase so it doesn't reappear on refresh
                      await supabase
                        .from('canvases')
                        .update({ deleted_at: new Date().toISOString() })
                        .eq('id', canvas.id);
                    };
                    if (hasRunningJob) {
                      useWorkspaceStore.getState().showConfirmDialog({
                        title: mc.confirmDialogs.closeTabWithJob.title,
                        body: mc.confirmDialogs.closeTabWithJob.body,
                        confirmLabel: mc.confirmDialogs.closeTabWithJob.confirm,
                        cancelLabel: mc.confirmDialogs.closeTabWithJob.cancel,
                        destructive: false,
                        onConfirm: closeTab,
                      });
                    } else {
                      closeTab();
                    }
                  }}
                />
              )}
            </button>
          );
        })}
        <button
          onClick={onCreateCanvas}
          className="p-1.5 text-white/30 hover:text-white/60 hover:bg-neutral-900/50 rounded transition-colors shrink-0"
          title={mc.tabs.newTab}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: undo/redo + credits */}
      <div className="flex items-center gap-2 shrink-0 pl-4">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => useCanvasStore.undo()}
            disabled={undoStack.length === 0}
            className="p-1 text-white/40 hover:text-white/70 disabled:text-white/15 rounded transition-colors"
            title={mc.undoRedo.undo}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => useCanvasStore.redo()}
            disabled={redoStack.length === 0}
            className="p-1 text-white/40 hover:text-white/70 disabled:text-white/15 rounded transition-colors"
            title={mc.undoRedo.redo}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <CreditsDisplay />
        <button
          onClick={() => {
            void signOut();
          }}
          className="p-1 text-white/40 hover:text-white/80 rounded transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
