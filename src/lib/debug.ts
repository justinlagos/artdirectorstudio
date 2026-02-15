/**
 * Lightweight debug logger — only logs in dev mode.
 * Usage: debugLog('canvasSync', { canvasId, itemCount: items.length });
 */

const IS_DEV = import.meta.env.DEV;

export function debugLog(scope: string, data: Record<string, unknown>): void {
  if (!IS_DEV) return;
  console.log(
    `%c[${scope}]`,
    'color: #7c6fff; font-weight: bold;',
    data
  );
}

export function debugWarn(scope: string, data: Record<string, unknown>): void {
  if (!IS_DEV) return;
  console.warn(`[${scope}]`, data);
}

export function debugError(scope: string, data: Record<string, unknown>): void {
  if (!IS_DEV) return;
  console.error(`[${scope}]`, data);
}
