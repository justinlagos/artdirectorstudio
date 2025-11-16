/**
 * Intelligence Framework - Main Export
 * 
 * Centralized exports for all intelligence modules
 */

export * from './imageUnderstanding';
export * from './promptIntelligence';
export * from './userBehavior';
export * from './visualTroubleshooting';

// Re-export types for convenience
export type {
  ImageUnderstanding,
} from './imageUnderstanding';

export type {
  PromptContext,
  SynthesizedPrompt,
} from './promptIntelligence';

export type {
  UserPreferences,
} from './userBehavior';

export type {
  VisualIssue,
} from './visualTroubleshooting';

