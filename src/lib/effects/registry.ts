export type EffectLane = 'instant' | 'server';

export interface EffectControl {
  key: string;
  label: string;
  type: 'slider' | 'toggle' | 'select';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | string | boolean;
  options?: string[];
}

export interface EffectDefinition {
  type: string;
  label: string;
  category: string;
  lane: EffectLane;
  defaultParams: Record<string, number | string | boolean>;
  controls: EffectControl[];
}

export const EFFECT_CATEGORIES = [
  'Essentials',
  'Color',
  'Detail',
  'Blur & Focus',
  'Stylize',
  'Geometry & Distort',
  'Background',
] as const;

export type EffectCategory = (typeof EFFECT_CATEGORIES)[number];

export const EFFECT_REGISTRY: EffectDefinition[] = [
  // --- Essentials ---
  {
    type: 'brightness',
    label: 'Brightness',
    category: 'Essentials',
    lane: 'instant',
    defaultParams: { amount: 1 },
    controls: [
      { key: 'amount', label: 'Amount', type: 'slider', min: 0.2, max: 3, step: 0.05, defaultValue: 1 },
    ],
  },
  {
    type: 'contrast',
    label: 'Contrast',
    category: 'Essentials',
    lane: 'instant',
    defaultParams: { amount: 1 },
    controls: [
      { key: 'amount', label: 'Amount', type: 'slider', min: 0.2, max: 3, step: 0.05, defaultValue: 1 },
    ],
  },
  {
    type: 'saturation',
    label: 'Saturation',
    category: 'Essentials',
    lane: 'instant',
    defaultParams: { amount: 1 },
    controls: [
      { key: 'amount', label: 'Amount', type: 'slider', min: 0, max: 3, step: 0.05, defaultValue: 1 },
    ],
  },
  {
    type: 'exposure',
    label: 'Exposure',
    category: 'Essentials',
    lane: 'instant',
    defaultParams: { amount: 1 },
    controls: [
      { key: 'amount', label: 'Amount', type: 'slider', min: 0.2, max: 3, step: 0.05, defaultValue: 1 },
    ],
  },

  // --- Color ---
  {
    type: 'hue_shift',
    label: 'Hue Shift',
    category: 'Color',
    lane: 'instant',
    defaultParams: { degrees: 0 },
    controls: [
      { key: 'degrees', label: 'Degrees', type: 'slider', min: 0, max: 360, step: 1, defaultValue: 0 },
    ],
  },
  {
    type: 'sepia',
    label: 'Sepia',
    category: 'Color',
    lane: 'instant',
    defaultParams: { amount: 0 },
    controls: [
      { key: 'amount', label: 'Amount', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0 },
    ],
  },
  {
    type: 'invert',
    label: 'Invert',
    category: 'Color',
    lane: 'instant',
    defaultParams: { amount: 0 },
    controls: [
      { key: 'amount', label: 'Amount', type: 'slider', min: 0, max: 1, step: 0.05, defaultValue: 0 },
    ],
  },
  {
    type: 'temperature',
    label: 'Temperature',
    category: 'Color',
    lane: 'instant',
    defaultParams: { amount: 0 },
    controls: [
      { key: 'amount', label: 'Warm/Cool', type: 'slider', min: -50, max: 50, step: 1, defaultValue: 0 },
    ],
  },

  // --- Detail ---
  {
    type: 'sharpen',
    label: 'Sharpen',
    category: 'Detail',
    lane: 'server',
    defaultParams: { amount: 0 },
    controls: [
      { key: 'amount', label: 'Amount', type: 'slider', min: 0, max: 100, step: 1, defaultValue: 0 },
    ],
  },
  {
    type: 'noise_reduction',
    label: 'Noise Reduction',
    category: 'Detail',
    lane: 'server',
    defaultParams: { amount: 0 },
    controls: [
      { key: 'amount', label: 'Amount', type: 'slider', min: 0, max: 100, step: 1, defaultValue: 0 },
    ],
  },
  {
    type: 'grain',
    label: 'Film Grain',
    category: 'Detail',
    lane: 'instant',
    defaultParams: { amount: 0 },
    controls: [
      { key: 'amount', label: 'Amount', type: 'slider', min: 0, max: 100, step: 1, defaultValue: 0 },
    ],
  },

  // --- Blur & Focus ---
  {
    type: 'blur',
    label: 'Gaussian Blur',
    category: 'Blur & Focus',
    lane: 'instant',
    defaultParams: { radius: 0 },
    controls: [
      { key: 'radius', label: 'Radius', type: 'slider', min: 0, max: 20, step: 0.5, defaultValue: 0 },
    ],
  },
  {
    type: 'vignette',
    label: 'Vignette',
    category: 'Blur & Focus',
    lane: 'server',
    defaultParams: { amount: 0 },
    controls: [
      { key: 'amount', label: 'Amount', type: 'slider', min: 0, max: 100, step: 1, defaultValue: 0 },
    ],
  },

  // --- Stylize ---
  {
    type: 'halftone',
    label: 'Halftone',
    category: 'Stylize',
    lane: 'server',
    defaultParams: { size: 4 },
    controls: [
      { key: 'size', label: 'Dot Size', type: 'slider', min: 2, max: 20, step: 1, defaultValue: 4 },
    ],
  },
  {
    type: 'posterize',
    label: 'Posterize',
    category: 'Stylize',
    lane: 'server',
    defaultParams: { levels: 6 },
    controls: [
      { key: 'levels', label: 'Levels', type: 'slider', min: 2, max: 16, step: 1, defaultValue: 6 },
    ],
  },
  {
    type: 'duotone',
    label: 'Duotone',
    category: 'Stylize',
    lane: 'server',
    defaultParams: { shadow: '#000000', highlight: '#ffffff' },
    controls: [
      { key: 'shadow', label: 'Shadow', type: 'select', defaultValue: '#000000', options: ['#000000', '#1a1a2e', '#16213e', '#0f3460'] },
      { key: 'highlight', label: 'Highlight', type: 'select', defaultValue: '#ffffff', options: ['#ffffff', '#e94560', '#f5c518', '#00ff88'] },
    ],
  },

  // --- Geometry & Distort ---
  {
    type: 'flip_h',
    label: 'Flip Horizontal',
    category: 'Geometry & Distort',
    lane: 'server',
    defaultParams: { enabled: true },
    controls: [
      { key: 'enabled', label: 'Enabled', type: 'toggle', defaultValue: true },
    ],
  },
  {
    type: 'flip_v',
    label: 'Flip Vertical',
    category: 'Geometry & Distort',
    lane: 'server',
    defaultParams: { enabled: true },
    controls: [
      { key: 'enabled', label: 'Enabled', type: 'toggle', defaultValue: true },
    ],
  },

  // --- Background ---
  {
    type: 'background_remove',
    label: 'Remove Background',
    category: 'Background',
    lane: 'server',
    defaultParams: {},
    controls: [],
  },
  {
    type: 'background_blur',
    label: 'Blur Background',
    category: 'Background',
    lane: 'server',
    defaultParams: { radius: 10 },
    controls: [
      { key: 'radius', label: 'Radius', type: 'slider', min: 2, max: 40, step: 1, defaultValue: 10 },
    ],
  },
];

export function getEffectsByCategory(): Record<string, EffectDefinition[]> {
  const result: Record<string, EffectDefinition[]> = {};
  for (const cat of EFFECT_CATEGORIES) {
    result[cat] = EFFECT_REGISTRY.filter((e) => e.category === cat);
  }
  return result;
}

export function getEffectDefinition(type: string): EffectDefinition | undefined {
  return EFFECT_REGISTRY.find((e) => e.type === type);
}
