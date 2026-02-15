import type { EffectLayer } from '@/types/canvas';

export interface BuiltInPreset {
  name: string;
  stack: EffectLayer[];
}

let _id = 0;
const pid = () => `preset-${++_id}`;

export const BUILT_IN_PRESETS: BuiltInPreset[] = [
  {
    name: 'Clean Studio',
    stack: [
      { id: pid(), type: 'brightness', lane: 'instant', enabled: true, order: 0, params: { amount: 1.05 } },
      { id: pid(), type: 'contrast', lane: 'instant', enabled: true, order: 1, params: { amount: 1.1 } },
      { id: pid(), type: 'saturation', lane: 'instant', enabled: true, order: 2, params: { amount: 0.95 } },
    ],
  },
  {
    name: 'Premium Grade',
    stack: [
      { id: pid(), type: 'contrast', lane: 'instant', enabled: true, order: 0, params: { amount: 1.15 } },
      { id: pid(), type: 'saturation', lane: 'instant', enabled: true, order: 1, params: { amount: 1.1 } },
      { id: pid(), type: 'brightness', lane: 'instant', enabled: true, order: 2, params: { amount: 1.02 } },
    ],
  },
  {
    name: 'Muted Editorial',
    stack: [
      { id: pid(), type: 'saturation', lane: 'instant', enabled: true, order: 0, params: { amount: 0.6 } },
      { id: pid(), type: 'contrast', lane: 'instant', enabled: true, order: 1, params: { amount: 0.9 } },
      { id: pid(), type: 'sepia', lane: 'instant', enabled: true, order: 2, params: { amount: 0.15 } },
    ],
  },
  {
    name: 'High Contrast BnW',
    stack: [
      { id: pid(), type: 'saturation', lane: 'instant', enabled: true, order: 0, params: { amount: 0 } },
      { id: pid(), type: 'contrast', lane: 'instant', enabled: true, order: 1, params: { amount: 1.6 } },
      { id: pid(), type: 'brightness', lane: 'instant', enabled: true, order: 2, params: { amount: 1.05 } },
    ],
  },
  {
    name: 'Retro Print',
    stack: [
      { id: pid(), type: 'sepia', lane: 'instant', enabled: true, order: 0, params: { amount: 0.35 } },
      { id: pid(), type: 'contrast', lane: 'instant', enabled: true, order: 1, params: { amount: 1.1 } },
      { id: pid(), type: 'saturation', lane: 'instant', enabled: true, order: 2, params: { amount: 0.8 } },
    ],
  },
  {
    name: 'Cyber Glitch',
    stack: [
      { id: pid(), type: 'hue_shift', lane: 'instant', enabled: true, order: 0, params: { degrees: 180 } },
      { id: pid(), type: 'contrast', lane: 'instant', enabled: true, order: 1, params: { amount: 1.4 } },
      { id: pid(), type: 'saturation', lane: 'instant', enabled: true, order: 2, params: { amount: 1.5 } },
    ],
  },
  {
    name: 'Poster Pop',
    stack: [
      { id: pid(), type: 'saturation', lane: 'instant', enabled: true, order: 0, params: { amount: 1.8 } },
      { id: pid(), type: 'contrast', lane: 'instant', enabled: true, order: 1, params: { amount: 1.3 } },
      { id: pid(), type: 'brightness', lane: 'instant', enabled: true, order: 2, params: { amount: 1.1 } },
    ],
  },
];
