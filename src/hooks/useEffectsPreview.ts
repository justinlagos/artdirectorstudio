import { useMemo } from 'react';
import { useWorkspaceStore, type EffectLayer } from '@/store/workspaceStore';

/**
 * Compute a CSS filter string from the enabled Lane A effects in the preview stack.
 */
function computeFilterStyle(stack: EffectLayer[]): string {
  const parts: string[] = [];

  for (const layer of stack) {
    if (!(layer as any).enabled) continue;
    if ((layer as any).lane !== 'instant') continue;

    const p = (layer as any).params ?? layer;
    switch (layer.type) {
      case 'brightness':
        parts.push(`brightness(${p.amount ?? 1})`);
        break;
      case 'contrast':
        parts.push(`contrast(${p.amount ?? 1})`);
        break;
      case 'saturation':
        parts.push(`saturate(${p.amount ?? 1})`);
        break;
      case 'exposure':
        parts.push(`brightness(${p.amount ?? 1})`);
        break;
      case 'hue_shift':
        parts.push(`hue-rotate(${p.degrees ?? 0}deg)`);
        break;
      case 'sepia':
        parts.push(`sepia(${p.amount ?? 0})`);
        break;
      case 'invert':
        parts.push(`invert(${p.amount ?? 0})`);
        break;
      case 'blur':
        parts.push(`blur(${p.radius ?? 0}px)`);
        break;
      default:
        break;
    }
  }

  return parts.length > 0 ? parts.join(' ') : '';
}

export function useEffectsPreview() {
  const stack = useWorkspaceStore((s) => s.effectsPreviewStack);

  const filterStyle = useMemo(() => computeFilterStyle(stack), [stack]);

  const hasLaneBEffects = useMemo(
    () => stack.some((l) => (l as any).enabled && (l as any).lane === 'server'),
    [stack]
  );

  return { filterStyle, hasLaneBEffects };
}
