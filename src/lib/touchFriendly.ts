/**
 * Touch-Friendly UI Utilities
 * 
 * Ensures all interactive elements meet accessibility and mobile usability standards.
 * Minimum touch target size: 44px x 44px (Apple HIG & Material Design guidelines)
 */

import { cn } from "./utils";

/**
 * Minimum touch target sizes
 */
export const TOUCH_TARGET = {
  // Standard touch target (44x44px - Apple HIG, WCAG AA)
  standard: 'min-h-[44px] min-w-[44px]',
  
  // Comfortable touch target (56x56px - larger for primary actions)
  comfortable: 'min-h-[56px] min-w-[56px]',
  
  // Input fields
  input: 'min-h-[44px]',
  inputComfortable: 'min-h-[56px]',
  
  // Buttons
  button: 'min-h-[44px] px-4',
  buttonLarge: 'min-h-[56px] px-6',
  iconButton: 'min-h-[44px] min-w-[44px]',
  iconButtonLarge: 'min-h-[56px] min-w-[56px]',
} as const;

/**
 * Mobile-optimized spacing
 */
export const MOBILE_SPACING = {
  // Gap between interactive elements
  gapTight: 'gap-2 md:gap-3',
  gapBase: 'gap-4 md:gap-4',
  gapLoose: 'gap-6 md:gap-8',
  
  // Padding for touch areas
  paddingTight: 'p-2 md:p-3',
  paddingBase: 'p-4 md:p-6',
  paddingLoose: 'p-6 md:p-8',
  
  // Margin for sections
  marginSection: 'my-8 md:my-12',
  marginBlock: 'my-6 md:my-8',
} as const;

/**
 * Safe area insets for notched devices
 */
export const SAFE_AREA = {
  // Bottom safe area (for iPhone notch, Android gesture bar)
  bottom: 'pb-[calc(1rem+env(safe-area-inset-bottom))]',
  bottomTight: 'pb-[calc(0.5rem+env(safe-area-inset-bottom))]',
  
  // Top safe area (for status bar)
  top: 'pt-[calc(1rem+env(safe-area-inset-top))]',
  topTight: 'pt-[calc(0.5rem+env(safe-area-inset-top))]',
  
  // Full safe area
  all: 'p-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]',
} as const;

/**
 * Keyboard-aware spacing for input fields
 * Adds extra padding to prevent keyboard from covering inputs
 */
export const KEYBOARD_AWARE = {
  input: 'pb-[calc(1rem+env(safe-area-inset-bottom))]',
  container: 'pb-[calc(2rem+env(safe-area-inset-bottom))]',
} as const;

/**
 * Touch-friendly class generator
 * 
 * @example
 * ```tsx
 * <Button className={touchFriendly('button', { large: true })}>
 *   Tap me
 * </Button>
 * ```
 */
export function touchFriendly(
  element: keyof typeof TOUCH_TARGET,
  options: {
    spacing?: keyof typeof MOBILE_SPACING;
    safeArea?: keyof typeof SAFE_AREA;
    className?: string;
  } = {}
) {
  return cn(
    TOUCH_TARGET[element],
    options.spacing && MOBILE_SPACING[options.spacing],
    options.safeArea && SAFE_AREA[options.safeArea],
    options.className
  );
}

/**
 * Check if current device is touch-capable
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - Some browsers have this
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get optimal spacing for current device
 */
export function getOptimalSpacing(): 'tight' | 'base' | 'loose' {
  if (typeof window === 'undefined') return 'base';
  
  const isTouch = isTouchDevice();
  const screenWidth = window.innerWidth;
  
  // Mobile touch devices need more spacing
  if (isTouch && screenWidth < 768) {
    return 'loose';
  }
  
  // Tablet
  if (screenWidth >= 768 && screenWidth < 1024) {
    return 'base';
  }
  
  // Desktop
  return 'tight';
}
