/**
 * Z-Index Hierarchy Map
 * Centralized z-index management for consistent layering across the application
 *
 * Layer order (lowest to highest):
 * 1-9:     Base content
 * 10-19:   Sticky elements (headers, sidebars)
 * 20-29:   Tooltips, popovers, dropdowns, selects
 * 30-39:   Modal backdrops/overlays
 * 40-49:   Modal content
 * 50-59:   Navigation elements
 * 60-69:   Floating UI elements (Artie icon)
 * 70-79:   Artie panel (special case - above floating icon)
 * 80-89:   High-priority modals (ArtieModal)
 * 90-94:   Toasts, notifications, alerts
 * 95-99:   Nested modal backdrop (for modals inside modals)
 * 100:     Nested modal content (ImageZoomDialog, etc.)
 * 105:     Performance monitor (debug only)
 */

export const zIndexMap = {
  // Base layers
  base: 0,
  pageContent: 1,

  // Sticky elements
  sticky: 10,
  fixedUI: 10,

  // Overlays and popups
  tooltip: 20,
  popover: 20,
  dropdown: 25,
  select: 25,

  // Standard modals
  modalBackdrop: 30,
  modalContent: 40,
  dialog: 40,
  sheet: 40,
  drawer: 40,

  // Navigation
  navigation: 50,
  header: 50,
  bottomNav: 50,

  // Artie floating elements
  artieFloating: 60,
  artiePanelBackdrop: 70,
  artiePanel: 71,
  artieModalBackdrop: 80,
  artieModalContent: 81,

  // Notifications
  toast: 90,
  alert: 90,

  // Nested modals (modals that open inside other modals)
  nestedModalBackdrop: 95,
  nestedModalContent: 100,

  // Debug tools
  performanceMonitor: 105,
} as const;

export type ZIndexKey = keyof typeof zIndexMap;

/**
 * Get z-index value by key
 */
export const getZIndex = (key: ZIndexKey): number => zIndexMap[key];

/**
 * Get CSS variable string for z-index
 */
export const getZIndexVar = (key: ZIndexKey): string => `var(--z-${key})`;

/**
 * Generate CSS custom properties for z-index values
 * Use in :root or apply via JavaScript
 */
export const generateZIndexCSSVars = (): Record<string, number> => {
  const vars: Record<string, number> = {};
  for (const [key, value] of Object.entries(zIndexMap)) {
    vars[`--z-${key}`] = value;
  }
  return vars;
};

export default zIndexMap;
