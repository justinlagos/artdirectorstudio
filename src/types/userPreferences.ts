/**
 * User Preferences Types
 * 
 * Defines the structure for user UI preferences stored in profiles.ui_preferences
 */

export type WorkspaceMode = 'classic' | 'auto';

export type ArtieProactiveMode = 'enabled' | 'disabled';

export type KeyboardShortcutsMode = 'enabled' | 'disabled';

export interface GenerationPreferences {
  preferredQuality?: 'high' | 'medium' | 'low' | 'auto';
  preferredRatio?: '1:1' | '4:5' | '3:2' | '2:3' | '16:9' | '9:16' | '4:3' | '3:4';
  lastUsedSettings?: {
    quality?: 'high' | 'medium' | 'low' | 'auto';
    aspectRatio?: '1:1' | '4:5' | '3:2' | '2:3' | '16:9' | '9:16' | '4:3' | '3:4';
    background?: 'transparent' | 'opaque' | 'auto';
  };
}

export interface ExperimentalFeatures {
  proactiveArtie?: boolean;
  keyboardShortcuts?: boolean;
  campaignBuilder?: boolean;
}

export interface UserUIPreferences {
  workspaceMode?: WorkspaceMode;
  artieProactiveMode?: ArtieProactiveMode;
  keyboardShortcuts?: KeyboardShortcutsMode;
  experimentalFeatures?: ExperimentalFeatures;
  generation?: GenerationPreferences;
}

/**
 * Default preferences for new users
 */
export const DEFAULT_USER_PREFERENCES: UserUIPreferences = {
  workspaceMode: 'classic',
  artieProactiveMode: 'disabled',
  keyboardShortcuts: 'disabled',
  experimentalFeatures: {
    proactiveArtie: false,
    keyboardShortcuts: false,
    campaignBuilder: false,
  },
  generation: {
    preferredQuality: 'auto',
    preferredRatio: '1:1',
  },
};
