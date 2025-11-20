/**
 * Standardized responsive design utilities
 * Consistent breakpoints and patterns across the app
 */

export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Responsive class patterns for common components
 */
export const responsive = {
  // Modal/Dialog sizing
  modal: {
    width: 'w-full sm:max-w-lg md:max-w-2xl lg:max-w-4xl',
    padding: 'p-4 sm:p-6 md:p-8',
    gap: 'gap-4 sm:gap-6 md:gap-8',
  },

  // Container patterns
  container: {
    maxWidth: 'max-w-7xl mx-auto',
    padding: 'px-4 sm:px-6 lg:px-8',
    section: 'py-8 sm:py-12 md:py-16',
  },

  // Typography scales
  text: {
    h1: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
    h2: 'text-2xl sm:text-3xl md:text-4xl',
    h3: 'text-xl sm:text-2xl md:text-3xl',
    h4: 'text-lg sm:text-xl md:text-2xl',
    body: 'text-sm sm:text-base',
    small: 'text-xs sm:text-sm',
  },

  // Spacing patterns
  spacing: {
    section: 'space-y-4 sm:space-y-6 md:space-y-8',
    stack: 'space-y-2 sm:space-y-3 md:space-y-4',
    inline: 'space-x-2 sm:space-x-3 md:space-x-4',
  },

  // Grid patterns
  grid: {
    auto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    twoCol: 'grid grid-cols-1 md:grid-cols-2',
    threeCol: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    sidebar: 'grid grid-cols-1 lg:grid-cols-[300px_1fr]',
  },

  // Button sizing
  button: {
    sm: 'h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm',
    default: 'h-9 px-4 text-sm sm:h-10 sm:px-5 sm:text-base',
    lg: 'h-10 px-6 text-base sm:h-11 sm:px-8 sm:text-lg',
  },

  // Image sizing
  image: {
    avatar: 'w-8 h-8 sm:w-10 sm:h-10',
    thumbnail: 'w-16 h-16 sm:w-20 sm:h-20',
    card: 'w-full h-48 sm:h-56 md:h-64',
    hero: 'w-full h-64 sm:h-80 md:h-96 lg:h-[500px]',
  },

  // Safe area (for mobile notches/home indicators)
  safeArea: {
    top: 'pt-safe-top',
    bottom: 'pb-safe-bottom',
    left: 'pl-safe-left',
    right: 'pr-safe-right',
    x: 'px-safe-left px-safe-right',
    y: 'pt-safe-top pb-safe-bottom',
  },
} as const;

/**
 * Media query hooks for responsive behavior in JavaScript
 */
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs})`,
  sm: `(min-width: ${breakpoints.sm})`,
  md: `(min-width: ${breakpoints.md})`,
  lg: `(min-width: ${breakpoints.lg})`,
  xl: `(min-width: ${breakpoints.xl})`,
  '2xl': `(min-width: ${breakpoints['2xl']})`,
  touch: '(hover: none) and (pointer: coarse)',
  mouse: '(hover: hover) and (pointer: fine)',
} as const;
