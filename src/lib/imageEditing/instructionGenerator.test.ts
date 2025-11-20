import { describe, it, expect } from 'vitest';
import {
  generateInstructionFromAdjustments,
  generateFilterStyle,
  DEFAULT_ADJUSTMENTS,
  type Adjustments,
} from './instructionGenerator';

describe('instructionGenerator', () => {
  describe('generateInstructionFromAdjustments', () => {
    it('should return empty string for default adjustments', () => {
      const result = generateInstructionFromAdjustments(DEFAULT_ADJUSTMENTS);
      expect(result).toBe('');
    });

    it('should generate instruction for brightness increase', () => {
      const adjustments: Adjustments = {
        ...DEFAULT_ADJUSTMENTS,
        brightness: 120,
      };
      const result = generateInstructionFromAdjustments(adjustments);
      expect(result).toContain('brightness');
      expect(result).toContain('20%');
    });

    it('should generate instruction for multiple adjustments', () => {
      const adjustments: Adjustments = {
        ...DEFAULT_ADJUSTMENTS,
        brightness: 120,
        contrast: 80,
        saturation: 130,
      };
      const result = generateInstructionFromAdjustments(adjustments);
      expect(result).toContain('brightness');
      expect(result).toContain('contrast');
      expect(result).toContain('saturation');
    });

    it('should respect custom threshold', () => {
      const adjustments: Adjustments = {
        ...DEFAULT_ADJUSTMENTS,
        brightness: 105,
      };
      const resultDefault = generateInstructionFromAdjustments(adjustments);
      const resultCustom = generateInstructionFromAdjustments(adjustments, 3);
      
      expect(resultDefault).toBe(''); // 5% change below default threshold of 10
      expect(resultCustom).toContain('brightness'); // 5% change above custom threshold of 3
    });

    it('should generate instruction for all adjustment types', () => {
      const adjustments: Adjustments = {
        brightness: 120,
        contrast: 120,
        saturation: 120,
        hue: 20,
        warmth: 120,
        exposure: 120,
        sharpness: 120,
        vibrance: 120,
        shadows: 120,
        highlights: 120,
        clarity: 120,
      };
      const result = generateInstructionFromAdjustments(adjustments, 5);
      
      expect(result).toContain('brightness');
      expect(result).toContain('contrast');
      expect(result).toContain('saturation');
      expect(result).toContain('hue');
      expect(result).toContain('warmth');
      expect(result).toContain('exposure');
      expect(result).toContain('sharpness');
      expect(result).toContain('vibrance');
      expect(result).toContain('shadows');
      expect(result).toContain('highlights');
      expect(result).toContain('clarity');
    });
  });

  describe('generateFilterStyle', () => {
    it('should return empty string for default adjustments', () => {
      const result = generateFilterStyle(DEFAULT_ADJUSTMENTS);
      expect(result).toBe('');
    });

    it('should generate CSS filter for brightness', () => {
      const adjustments: Adjustments = {
        ...DEFAULT_ADJUSTMENTS,
        brightness: 120,
      };
      const result = generateFilterStyle(adjustments);
      expect(result).toContain('brightness(1.2)');
    });

    it('should generate CSS filter for multiple adjustments', () => {
      const adjustments: Adjustments = {
        ...DEFAULT_ADJUSTMENTS,
        brightness: 120,
        contrast: 130,
        saturation: 110,
      };
      const result = generateFilterStyle(adjustments);
      expect(result).toContain('brightness(1.2)');
      expect(result).toContain('contrast(1.3)');
      expect(result).toContain('saturate(1.1)');
    });

    it('should handle hue rotation correctly', () => {
      const adjustments: Adjustments = {
        ...DEFAULT_ADJUSTMENTS,
        hue: 45,
      };
      const result = generateFilterStyle(adjustments);
      expect(result).toContain('hue-rotate(45deg)');
    });

    it('should handle negative hue rotation', () => {
      const adjustments: Adjustments = {
        ...DEFAULT_ADJUSTMENTS,
        hue: -30,
      };
      const result = generateFilterStyle(adjustments);
      expect(result).toContain('hue-rotate(-30deg)');
    });
  });
});
