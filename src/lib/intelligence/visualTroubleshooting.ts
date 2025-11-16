/**
 * Visual Troubleshooting System
 * 
 * Automatically detects issues and provides one-click fixes:
 * - Overexposed areas
 * - Uneven lighting
 * - Skin artifacts
 * - Unwanted reflections
 * - Composition imbalance
 * - Color mismatch
 * - Low clarity
 * - Bad shadows
 */

import type { ImageUnderstanding } from './imageUnderstanding';

export interface VisualIssue {
  type: 'overexposure' | 'underexposure' | 'uneven-lighting' | 'skin-artifacts' | 
        'reflections' | 'composition' | 'color-mismatch' | 'clarity' | 'shadows' | 'noise';
  severity: 'low' | 'medium' | 'high';
  description: string;
  fix: {
    action: string;
    instruction: string;
    adjustments?: Record<string, number>;
  };
  confidence: number; // 0-100
}

/**
 * Detect visual issues in an image
 */
export function detectVisualIssues(understanding: ImageUnderstanding): VisualIssue[] {
  const issues: VisualIssue[] = [];

  // Check exposure
  if (understanding.technical.exposure === 'overexposed') {
    issues.push({
      type: 'overexposure',
      severity: 'high',
      description: 'Image is overexposed with blown highlights',
      fix: {
        action: 'reduce-exposure',
        instruction: 'Reduce exposure by 20% and recover highlights',
        adjustments: { exposure: -20, highlights: -15 },
      },
      confidence: 85,
    });
  }

  if (understanding.technical.exposure === 'underexposed') {
    issues.push({
      type: 'underexposure',
      severity: 'high',
      description: 'Image is underexposed with lost shadow detail',
      fix: {
        action: 'increase-exposure',
        instruction: 'Increase exposure by 20% and lift shadows',
        adjustments: { exposure: 20, shadows: 15 },
      },
      confidence: 85,
    });
  }

  // Check lighting
  if (understanding.technical.shadows.quality === 'uneven' || understanding.technical.shadows.quality === 'harsh') {
    issues.push({
      type: 'uneven-lighting',
      severity: understanding.technical.shadows.issues.length > 0 ? 'high' : 'medium',
      description: 'Uneven or harsh shadows detected',
      fix: {
        action: 'balance-lighting',
        instruction: 'Balance lighting and soften shadows',
        adjustments: { shadows: 10, contrast: -5 },
      },
      confidence: 75,
    });
  }

  // Check clarity
  if (understanding.technical.sharpness < 60) {
    issues.push({
      type: 'clarity',
      severity: understanding.technical.sharpness < 40 ? 'high' : 'medium',
      description: 'Image lacks clarity and sharpness',
      fix: {
        action: 'enhance-clarity',
        instruction: 'Enhance clarity and sharpness',
        adjustments: { sharpness: 30, clarity: 20 },
      },
      confidence: 80,
    });
  }

  // Check noise
  if (understanding.technical.noise > 40) {
    issues.push({
      type: 'noise',
      severity: understanding.technical.noise > 60 ? 'high' : 'medium',
      description: 'High noise levels detected',
      fix: {
        action: 'reduce-noise',
        instruction: 'Reduce noise while preserving detail',
        adjustments: { noiseReduction: 25 },
      },
      confidence: 70,
    });
  }

  // Check blur
  if (understanding.technical.blur > 30) {
    issues.push({
      type: 'clarity',
      severity: understanding.technical.blur > 50 ? 'high' : 'medium',
      description: 'Image appears blurry',
      fix: {
        action: 'sharpen',
        instruction: 'Sharpen image and improve focus',
        adjustments: { sharpness: 40 },
      },
      confidence: 75,
    });
  }

  // Check contrast
  if (understanding.technical.contrast < 50) {
    issues.push({
      type: 'color-mismatch',
      severity: 'medium',
      description: 'Low contrast - image appears flat',
      fix: {
        action: 'increase-contrast',
        instruction: 'Increase contrast for more depth',
        adjustments: { contrast: 20 },
      },
      confidence: 70,
    });
  }

  // Check composition (if improvements suggest it)
  if (understanding.improvements.composition.length > 0) {
    issues.push({
      type: 'composition',
      severity: 'low',
      description: understanding.improvements.composition[0],
      fix: {
        action: 'improve-composition',
        instruction: understanding.improvements.composition[0],
      },
      confidence: 60,
    });
  }

  // Sort by severity and confidence
  return issues.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return b.confidence - a.confidence;
  });
}

/**
 * Get one-click fix instruction for an issue
 */
export function getFixInstruction(issue: VisualIssue): string {
  return issue.fix.instruction;
}

/**
 * Get all available fixes as quick actions
 */
export function getQuickFixes(understanding: ImageUnderstanding): Array<{
  label: string;
  action: string;
  instruction: string;
}> {
  const issues = detectVisualIssues(understanding);
  
  return issues
    .filter(issue => issue.severity !== 'low') // Only show medium/high severity
    .map(issue => ({
      label: getFixLabel(issue.type),
      action: issue.fix.action,
      instruction: issue.fix.instruction,
    }));
}

function getFixLabel(type: VisualIssue['type']): string {
  const labels: Record<VisualIssue['type'], string> = {
    'overexposure': 'Fix Overexposure',
    'underexposure': 'Fix Underexposure',
    'uneven-lighting': 'Balance Lighting',
    'skin-artifacts': 'Fix Skin',
    'reflections': 'Remove Reflections',
    'composition': 'Improve Composition',
    'color-mismatch': 'Balance Colors',
    'clarity': 'Enhance Clarity',
    'shadows': 'Fix Shadows',
    'noise': 'Reduce Noise',
  };
  return labels[type] || 'Fix Issue';
}

/**
 * Apply fix adjustments to image
 */
export function getFixAdjustments(issue: VisualIssue): Record<string, number> | null {
  return issue.fix.adjustments || null;
}

