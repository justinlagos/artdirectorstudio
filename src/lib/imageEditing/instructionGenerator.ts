/**
 * Centralized Image Editing Instruction Generator
 * Single source of truth for converting adjustment sliders to natural language instructions
 * Used by EditImageModal and UniversalImageWorkspace
 */

export interface Adjustments {
  brightness: number;     // 0-200, default 100
  contrast: number;       // 0-200, default 100
  saturation: number;     // 0-200, default 100
  hue: number;           // -180 to 180, default 0
  warmth: number;        // -100 to 100, default 0
  exposure: number;      // -100 to 100, default 0
  sharpness: number;     // -100 to 100, default 0
  vibrance: number;      // 0-200, default 100
  shadows: number;       // -100 to 100, default 0
  highlights: number;    // -100 to 100, default 0
  clarity: number;       // -100 to 100, default 0
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  warmth: 0,
  exposure: 0,
  sharpness: 0,
  vibrance: 100,
  shadows: 0,
  highlights: 0,
  clarity: 0,
};

/**
 * Generate natural language instruction from adjustment values
 * @param adjustments - Current adjustment values
 * @param threshold - Minimum change threshold to include (default 10)
 * @returns Natural language instruction string
 */
export function generateInstructionFromAdjustments(
  adjustments: Adjustments,
  threshold: number = 10
): string {
  const changes: string[] = [];
  
  // Helper to check if change is significant
  const isSignificant = (value: number, baseline: number, min: number = threshold) =>
    Math.abs(value - baseline) > min;
  
  // Brightness (0-200, baseline 100)
  if (isSignificant(adjustments.brightness, 100, threshold)) {
    const diff = adjustments.brightness - 100;
    changes.push(diff > 0 
      ? `increase brightness by ${Math.round(diff)}%`
      : `decrease brightness by ${Math.abs(Math.round(diff))}%`);
  }
  
  // Contrast (0-200, baseline 100)
  if (isSignificant(adjustments.contrast, 100, threshold)) {
    const diff = adjustments.contrast - 100;
    changes.push(diff > 0 
      ? `increase contrast by ${Math.round(diff)}%`
      : `decrease contrast by ${Math.abs(Math.round(diff))}%`);
  }
  
  // Saturation (0-200, baseline 100)
  if (isSignificant(adjustments.saturation, 100, threshold)) {
    const diff = adjustments.saturation - 100;
    changes.push(diff > 0 
      ? `make colors more vibrant by ${Math.round(diff)}%`
      : `reduce color saturation by ${Math.abs(Math.round(diff))}%`);
  }
  
  // Hue (-180 to 180, baseline 0)
  if (isSignificant(adjustments.hue, 0, 5)) {
    changes.push(`shift color hue by ${Math.round(adjustments.hue)} degrees`);
  }
  
  // Warmth (-100 to 100, baseline 0)
  if (isSignificant(adjustments.warmth, 0, threshold)) {
    changes.push(adjustments.warmth > 0 
      ? `add warm tones (${Math.round(adjustments.warmth)}% warmer)`
      : `add cool tones (${Math.abs(Math.round(adjustments.warmth))}% cooler)`);
  }
  
  // Exposure (-100 to 100, baseline 0)
  if (isSignificant(adjustments.exposure, 0, threshold)) {
    changes.push(adjustments.exposure > 0 
      ? `increase exposure by ${Math.round(adjustments.exposure)}%`
      : `decrease exposure by ${Math.abs(Math.round(adjustments.exposure))}%`);
  }
  
  // Vibrance (0-200, baseline 100)
  if (isSignificant(adjustments.vibrance, 100, threshold)) {
    const diff = adjustments.vibrance - 100;
    changes.push(diff > 0 
      ? `increase vibrance by ${Math.round(diff)}%`
      : `decrease vibrance by ${Math.abs(Math.round(diff))}%`);
  }
  
  // Sharpness (-100 to 100, baseline 0)
  if (isSignificant(adjustments.sharpness, 0, threshold)) {
    changes.push(adjustments.sharpness > 0 
      ? `sharpen by ${Math.round(adjustments.sharpness)}%`
      : `soften by ${Math.abs(Math.round(adjustments.sharpness))}%`);
  }
  
  // Shadows (-100 to 100, baseline 0)
  if (isSignificant(adjustments.shadows, 0, threshold)) {
    changes.push(adjustments.shadows > 0 
      ? `lift shadows by ${Math.round(adjustments.shadows)}%`
      : `darken shadows by ${Math.abs(Math.round(adjustments.shadows))}%`);
  }
  
  // Highlights (-100 to 100, baseline 0)
  if (isSignificant(adjustments.highlights, 0, threshold)) {
    changes.push(adjustments.highlights > 0 
      ? `brighten highlights by ${Math.round(adjustments.highlights)}%`
      : `reduce highlights by ${Math.abs(Math.round(adjustments.highlights))}%`);
  }
  
  // Clarity (-100 to 100, baseline 0)
  if (isSignificant(adjustments.clarity, 0, threshold)) {
    changes.push(adjustments.clarity > 0 
      ? `increase clarity by ${Math.round(adjustments.clarity)}%`
      : `decrease clarity by ${Math.abs(Math.round(adjustments.clarity))}%`);
  }
  
  if (changes.length === 0) {
    return '';
  }
  
  return `Adjust the image to ${changes.join(', ')}. Maintain the overall composition and subject matter.`;
}

/**
 * Generate CSS filter string from adjustments for real-time preview
 * @param adjustments - Current adjustment values
 * @returns CSS filter string
 */
export function generateFilterStyle(adjustments: Adjustments): string {
  const filters = [
    `brightness(${adjustments.brightness}%)`,
    `contrast(${adjustments.contrast}%)`,
    `saturate(${adjustments.saturation}%)`,
    `hue-rotate(${adjustments.hue}deg)`,
    adjustments.warmth > 0 
      ? `sepia(${Math.abs(adjustments.warmth)}%)` 
      : `saturate(${100 + adjustments.warmth}%)`,
    `brightness(${100 + adjustments.exposure}%)`,
  ];
  
  return filters.join(' ');
}
