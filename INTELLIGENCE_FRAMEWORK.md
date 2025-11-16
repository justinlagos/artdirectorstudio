# Intelligence Framework Implementation

## Overview

The Intelligence Framework makes the platform feel alive, smart, aware, and deeply creative. It consists of four core modules that work together to provide intelligent, context-aware experiences.

## Architecture

```
src/lib/intelligence/
├── imageUnderstanding.ts    # Deep image analysis pipeline
├── promptIntelligence.ts    # Context-locked prompt synthesis
├── userBehavior.ts          # User preference learning
├── visualTroubleshooting.ts # Auto-detect and fix issues
└── index.ts                 # Centralized exports

src/hooks/
└── useIntelligence.ts       # React hook for easy access
```

## Modules

### 1. Image Understanding Layer

**Purpose**: Deep analysis of images to capture comprehensive metadata

**Features**:
- Scene analysis (objects, subject, background)
- Visual properties (lighting, mood, color palette, style)
- Composition analysis (rule of thirds, depth, framing, perspective)
- Technical assessment (noise, blur, sharpness, exposure, contrast)
- Improvement suggestions (lighting, color, composition, technical)

**Usage**:
```typescript
import { analyzeImageDeep, getCachedUnderstanding } from '@/lib/intelligence/imageUnderstanding';

// Analyze image (uses cache if available)
const understanding = await analyzeImageDeep(imageUrl);

// Or get cached understanding
const cached = await getCachedUnderstanding(imageUrl);
```

**Storage**: Understanding is stored in `generated_assets.analysis_data.deepUnderstanding` with 24-hour cache.

### 2. Prompt Intelligence Layer

**Purpose**: Context-locked prompt synthesis that prevents drift

**Features**:
- Combines user prompt + image analysis + user preferences
- Maintains image fidelity while allowing variations
- Generates art-director level prompts
- Analyzes prompt drift potential
- Provides contextual suggestions

**Usage**:
```typescript
import { synthesizeContextLockedPrompt } from '@/lib/intelligence/promptIntelligence';

const synthesized = synthesizeContextLockedPrompt({
  userPrompt: "Make it more dramatic",
  imageUnderstanding: understanding,
  userPreferences: preferences,
  intent: 'variation', // or 'enhancement', 'style-change'
});
```

**Integration**: Automatically used in Studio when opening with an image.

### 3. User Behavior Learning

**Purpose**: Observe and learn from user actions to build preference profiles

**Features**:
- Tracks: upscale, blend, edit, save, reject actions
- Learns: preferred styles, colors, lighting, subject matter
- Builds: editing patterns, quality preferences
- Provides: personalized suggestions

**Usage**:
```typescript
import { learnFromUserAction, getUserPreferences } from '@/lib/intelligence/userBehavior';

// Track an action
await learnFromUserAction(userId, 'upscale', imageUrl, metadata);

// Get preferences
const preferences = await getUserPreferences(userId);
```

**Integration**: Automatically tracks actions in UniversalImageWorkspace, Blend, Upscale dialogs.

### 4. Visual Troubleshooting

**Purpose**: Auto-detect issues and provide one-click fixes

**Features**:
- Detects: overexposure, underexposure, uneven lighting, clarity issues, noise, blur
- Provides: Quick fix buttons with instructions
- Suggests: Adjustment values for automatic fixes

**Usage**:
```typescript
import { detectVisualIssues, getQuickFixes } from '@/lib/intelligence/visualTroubleshooting';

const issues = detectVisualIssues(understanding);
const quickFixes = getQuickFixes(understanding);
```

**Integration**: Automatically shown in UniversalImageWorkspace when issues are detected.

## React Hook

**useIntelligence** provides easy access to all intelligence features:

```typescript
import { useIntelligence } from '@/hooks/useIntelligence';

const {
  analyzeImage,
  synthesizePrompt,
  getArtDirectorPrompt,
  trackAction,
  getSuggestions,
  getVisualFixes,
  getQuickFixActions,
  checkDrift,
} = useIntelligence();
```

## Integration Points

### Studio
- **Location**: `src/lib/studio.ts`
- **Feature**: When opening Studio with an image, automatically:
  1. Analyzes image deeply
  2. Gets user preferences
  3. Synthesizes context-locked prompt
  4. Updates Studio prompt with intelligent version

### Universal Image Workspace
- **Location**: `src/components/UniversalImageWorkspace.tsx`
- **Features**:
  - Visual troubleshooting (quick fixes)
  - User behavior tracking (edit, upscale, blend, save actions)
  - Image understanding for context

### Artie Chat
- **Future Enhancement**: Can use intelligence for:
  - Image-to-text analysis for better context
  - Context-locked prompt suggestions
  - Personalized recommendations

## Data Flow

1. **Image Upload/Open** → Image Understanding analyzes → Stores in DB
2. **User Action** → Behavior Learning tracks → Updates preferences
3. **Prompt Creation** → Prompt Intelligence synthesizes → Context-locked prompt
4. **Image Issues** → Visual Troubleshooting detects → Quick fixes shown

## Caching Strategy

- **Image Understanding**: 24-hour cache in `generated_assets.analysis_data`
- **User Preferences**: Analyzed from last 100 assets, updated on each action
- **Quick Fixes**: Calculated on-demand from understanding

## Future Enhancements

1. **Multi-Step Intelligence**: Process compound tasks ("do this, then this")
2. **Blend Intelligence**: Semantic understanding of image relationships
3. **Studio Intelligence**: Predict user intent and guide generation
4. **Inspire Intelligence**: Show relevant work based on user's creations
5. **Mobile Intelligence**: Intent-aware suggestions, gesture-aware UI

## Performance Considerations

- Image understanding is cached to avoid repeated analysis
- User preferences are calculated incrementally
- Quick fixes are computed on-demand (lightweight)
- All operations are async and non-blocking

## Testing

The framework is designed to:
- Gracefully degrade if analysis fails
- Use cached data when available
- Fall back to basic functionality if intelligence unavailable
- Never block user actions

