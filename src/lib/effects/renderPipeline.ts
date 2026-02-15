import type { EffectLayer } from '@/types/canvas';

/**
 * Render Lane A effects client-side using OffscreenCanvas / Canvas 2D.
 * Returns a PNG Blob.
 */
export async function renderEffects(
  sourceUrl: string,
  stack: EffectLayer[]
): Promise<Blob> {
  // Fetch and decode source image
  const response = await fetch(sourceUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  // Build CSS-like filter string from Lane A effects
  const filterParts: string[] = [];

  for (const layer of stack) {
    if (!layer.enabled || layer.lane !== 'instant') continue;

    const p = layer.params;
    switch (layer.type) {
      case 'brightness':
        filterParts.push(`brightness(${p.amount ?? 1})`);
        break;
      case 'contrast':
        filterParts.push(`contrast(${p.amount ?? 1})`);
        break;
      case 'saturation':
        filterParts.push(`saturate(${p.amount ?? 1})`);
        break;
      case 'exposure':
        filterParts.push(`brightness(${p.amount ?? 1})`);
        break;
      case 'hue_shift':
        filterParts.push(`hue-rotate(${p.degrees ?? 0}deg)`);
        break;
      case 'sepia':
        filterParts.push(`sepia(${p.amount ?? 0})`);
        break;
      case 'invert':
        filterParts.push(`invert(${p.amount ?? 0})`);
        break;
      case 'blur':
        filterParts.push(`blur(${p.radius ?? 0}px)`);
        break;
      case 'grain':
        // Grain can't be done via CSS filter — we skip it in this pipeline
        break;
    }
  }

  ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';
  ctx.drawImage(bitmap, 0, 0);

  // Export as PNG
  const result = await canvas.convertToBlob({ type: 'image/png' });
  return result;
}
