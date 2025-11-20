# AI Roadmap: Gemini 3 Integration Plan

## Overview
This document outlines the phased integration of Gemini 3 (or future advanced multimodal AI models) into ArtDirector Studio to enhance image understanding, creative direction, and visual consistency.

## Current State
- **Image Analysis**: Uses Lovable AI gateway with google/gemini-2.5-flash for image understanding
- **Prompt Generation**: Expert prompt generator creates structured art-direction prompts
- **Visual Context**: New `visualContextStore` maintains continuity across tools
- **Intelligence Framework**: Existing system in `src/lib/intelligence/` handles analysis, prompt synthesis, and user behavior

## Extension Points
The codebase is designed with clear extension points for future model upgrades:

### 1. `src/lib/intelligence/imageUnderstanding.ts`
```typescript
// Current: analyzeImageDeep() uses Lovable AI
// Extension point: Swap model in API call
export async function analyzeImageDeep(imageUrl: string): Promise<ImageUnderstanding> {
  // TODO: When Gemini 3 available, update model parameter
  // model: "google/gemini-3-pro" or "google/gemini-3-flash"
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    // ... existing logic
  });
}
```

### 2. `src/lib/intelligence/promptIntelligence.ts`
```typescript
// Current: generateArtDirectorPrompt() creates expert prompts
// Extension point: Enhanced creative director reasoning
export async function generateCreativeDirectorPrompt(options: {
  userPrompt: string;
  imageUrl?: string;
  imageUnderstanding?: ImageUnderstanding;
  // ... other params
}): Promise<CreativePrompt> {
  // TODO: Leverage Gemini 3's advanced reasoning for:
  // - Deeper style analysis
  // - Better composition suggestions
  // - More nuanced art direction
}
```

### 3. `src/lib/studio.ts`
```typescript
// Current: openStudioWithPrompt() orchestrates analysis
// Extension point: Already uses visualContextStore for multi-tool continuity
// Ready for enhanced context passing when Gemini 3 is available
```

## Phased Integration Plan

### Phase A: Analysis & Creative Direction (Text In, Text Out)
**Goal**: Use Gemini 3 for better image understanding and art-direction prompts without changing generation

**Changes**:
1. Update `analyzeImageDeep()` to use Gemini 3 for:
   - More accurate subject/composition detection
   - Better lighting and color palette analysis
   - Improved art style classification
   
2. Enhance `generateCreativeDirectorPrompt()` with Gemini 3's reasoning:
   - Contextual prompt refinement based on previous operations
   - Style consistency suggestions across image sessions
   - Better understanding of user intent from brief language

**Benefits**:
- Smarter Artie responses
- More accurate visual briefs
- Better prompt suggestions in Studio

**Risk**: Low - only text processing changes, no generation pipeline modifications

### Phase B: Multimodal Layout & Composition Feedback
**Goal**: Use Gemini 3's multimodal capabilities for advanced visual feedback on uploaded images

**Changes**:
1. Add new function `analyzeLayoutAndComposition()`:
   - Detect visual hierarchy issues
   - Suggest composition improvements
   - Identify design patterns and styles
   
2. Create `visualTroubleshootingGemini.ts`:
   - Enhanced version of existing `visualTroubleshooting.ts`
   - Use Gemini 3 to identify specific visual problems
   - Suggest concrete fixes (lighting, cropping, color adjustments)
   
3. Update Edit Image modal to show AI suggestions:
   - "Artie noticed: This image could benefit from [specific fix]"
   - One-click apply suggestions via edit-image edge function

**Benefits**:
- Proactive creative guidance
- Faster iteration cycles
- Better results with less manual tweaking

**Risk**: Medium - requires UI updates and new edge function logic

### Phase C: Image Generation & Editing Improvements
**Goal**: Explore Gemini 3's potential for image generation/editing (when available via AI gateway)

**Changes**:
1. If/when Gemini 3 supports image generation via Lovable AI:
   - Add model option in Studio generation dialog
   - A/B test quality vs google/gemini-2.5-flash
   
2. Enhanced edit-image backend:
   - Use Gemini 3's understanding to better interpret edit instructions
   - More accurate region-specific edits
   - Smarter continuation/refinement of existing images

**Benefits**:
- Higher quality outputs
- More accurate interpretation of vague edit instructions
- Better style consistency across iterations

**Risk**: High - depends on Gemini 3 image generation availability and pricing

## Implementation Strategy

### Step 1: Create Abstraction Layer (Now)
```typescript
// src/lib/aiModels.ts
export interface AIModelConfig {
  provider: 'lovable-ai';
  model: string;
  supportsVision: boolean;
  supportsGeneration: boolean;
}

export const AI_MODELS = {
  imageAnalysis: {
    provider: 'lovable-ai',
    model: 'google/gemini-2.5-flash', // Can upgrade to gemini-3 later
    supportsVision: true,
    supportsGeneration: false,
  },
  promptRefinement: {
    provider: 'lovable-ai',
    model: 'google/gemini-2.5-pro',
    supportsVision: true,
    supportsGeneration: false,
  },
} as const;
```

### Step 2: Gradual Migration
- Phase A can begin immediately when Gemini 3 is available on Lovable AI
- Phase B requires 1-2 weeks of UI/UX work
- Phase C depends on Gemini 3 image generation capabilities

### Step 3: Monitoring & Rollback
- Add feature flags for each phase
- Track quality metrics (user satisfaction, retry rates)
- Easy rollback to previous models if issues arise

## Cost Considerations
- Gemini 3 Pro: Higher cost, use for critical analysis only
- Gemini 3 Flash: Balanced cost/performance, suitable for most operations
- Implement smart caching to avoid redundant API calls (already in place via `getCachedUnderstanding`)

## Timeline Estimate
- **Phase A**: 3-5 days development + 1 week testing (when Gemini 3 available)
- **Phase B**: 2-3 weeks development + 1 week testing
- **Phase C**: TBD, depends on Gemini 3 image generation release

## Success Metrics
- Improved prompt quality (subjective user ratings)
- Reduced number of regenerations needed
- Higher user satisfaction scores
- Faster time-to-final-image

---

**Last Updated**: 2025-01-20
**Next Review**: When Gemini 3 becomes available on Lovable AI gateway
