import { useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import type { ImageItemData } from '@/types/canvas';

const GUARDRAILS = 'Ensure safe-for-work output. No explicit content. Maintain artistic quality and coherence.';

export function usePromptSystem(itemId: string | null | undefined) {
  const items = useCanvasStore((s) => s.items);
  const item = itemId ? items.find((i) => i.id === itemId && !i.deleted_at) : null;
  const data = item?.type === 'image' ? (item.data as ImageItemData) : null;

  const lockedDescription = data?.locked_description ?? '';
  const editableDirection = data?.editable_direction ?? '';

  const setEditableDirection = useCallback(
    (direction: string) => {
      if (!item) return;
      useCanvasStore.updateItem(item.id, {
        data: { ...item.data, editable_direction: direction } as ImageItemData,
      });
    },
    [item]
  );

  const fullPrompt = useMemo(() => {
    const parts: string[] = [];
    if (lockedDescription) parts.push(lockedDescription);
    if (editableDirection) parts.push(editableDirection);
    parts.push(GUARDRAILS);
    return parts.join('\n\n');
  }, [lockedDescription, editableDirection]);

  const isReady = !!lockedDescription;

  return {
    lockedDescription,
    editableDirection,
    setEditableDirection,
    fullPrompt,
    isReady,
    analysisData: data?.analysis_data ?? null,
  };
}
