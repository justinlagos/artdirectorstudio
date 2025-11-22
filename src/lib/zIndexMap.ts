/**
 * Centralized Z-Index Management
 * 
 * CRITICAL: Use these constants instead of arbitrary z-index values.
 * This ensures consistent layering across the entire application.
 * 
 * Hierarchy (lowest to highest):
 * - Base content: 0-9
 * - Tooltips & Popovers: 20
 * - Dropdowns & Selects: 25
 * - Modal backdrops: 30
 * - Modal content: 40
 * - Navigation: 50
 * - Artie floating icon: 60
 * - Artie panel: 70-71
 * - Artie modal: 80-81
 * - Toasts: 90
 * - Performance monitor: 95
 */

export const Z_INDEX = {
  // Base layers
  base: 0,
  sticky: 10,
  
  // Overlays & UI elements
  tooltip: 20,
  popover: 20,
  dropdown: 25,
  select: 25,
  
  // Modals (standard)
  modalBackdrop: 30,
  modalContent: 40,
  dialog: 40,
  sheet: 40,
  drawer: 40,
  
  // Navigation
  header: 50,
  bottomNav: 50,
  
  // Artie system
  artieFloating: 60,
  artiePanelBackdrop: 70,
  artiePanelContent: 71,
  artieModalBackdrop: 80,
  artieModalContent: 81,
  
  // Notifications
  toast: 90,
  alert: 90,
  
  // Debug/Development
  performanceMonitor: 95,
} as const;

/**
 * Tailwind z-index class mapping
 * Use these in className props for consistency
 */
export const Z_INDEX_CLASSES = {
  tooltip: 'z-[20]',
  popover: 'z-[20]',
  dropdown: 'z-[25]',
  select: 'z-[25]',
  modalBackdrop: 'z-[30]',
  modalContent: 'z-[40]',
  dialog: 'z-[40]',
  header: 'z-[50]',
  bottomNav: 'z-[50]',
  artieFloating: 'z-[60]',
  artiePanelBackdrop: 'z-[70]',
  artiePanelContent: 'z-[71]',
  artieModalBackdrop: 'z-[80]',
  artieModalContent: 'z-[81]',
  toast: 'z-[90]',
  performanceMonitor: 'z-[95]',
} as const;

/**
 * CSS custom property mapping for use in index.css
 * These should match the values above
 */
export const Z_INDEX_CSS_VARS = {
  '--z-tooltip': '20',
  '--z-popover': '20',
  '--z-dropdown': '25',
  '--z-modal-backdrop': '30',
  '--z-modal-content': '40',
  '--z-navigation': '50',
  '--z-artie-floating': '60',
  '--z-artie-panel-backdrop': '70',
  '--z-artie-panel': '71',
  '--z-artie-modal-backdrop': '80',
  '--z-artie-modal-content': '81',
  '--z-toast': '90',
} as const;
