export const LAYOUT = {
  content: 'max-w-3xl',      // 768px - Primary content (optimal reading width)
  contentWide: 'max-w-4xl',  // 896px - Forms, settings
  dashboard: 'max-w-5xl',    // 1024px - Admin, analytics
  gallery: 'max-w-6xl',      // 1152px - Image grids
  hero: 'max-w-7xl',         // 1280px - Landing hero only
} as const;

export const PADDING = {
  responsive: 'px-4 sm:px-6 lg:px-8 xl:px-12',
  section: 'py-12 lg:py-16 xl:py-20',
  sectionInner: 'space-y-6 lg:space-y-8',
} as const;

export const GRID = {
  gallery: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  content: 'grid-cols-1 lg:grid-cols-2',
  spacing: 'gap-4 lg:gap-6',
} as const;
