# Development Changelog - ArtDirector Studio Overhaul

**Branch**: main (work will be committed directly)
**Start Date**: 2026-02-05
**Engineer**: Claude (Full-Stack Dev Squad)

## Objectives
1. Remove Lovable provider completely
2. Fix Artie chat layout (no page growth)
3. Redesign landing page (premium art director feel)
4. Add Caricature tool with 4 presets
5. Zero regressions

---

## Phase 0: Discovery and Baseline

### 0.1 Baseline Branch
- Current branch: **main**
- Change log created: ✓

### 0.2 Baseline Checks

#### Install Status
✓ node_modules present and up-to-date

#### Lint Check
⚠️ **PASS** - Warnings only, no errors
- Multiple unused vars (can be cleaned up later)
- Console.log statements (non-blocking)
- Some `any` types (non-blocking)

#### TypeCheck
✓ **PASS** - TypeScript compilation successful with no errors

#### Build Check
❌ **BLOCKED** - Rollup ARM64 dependency issue in VM
- This is a VM infrastructure issue, not a code issue
- Build should work on user's Mac (x64/arm64)
- Not a blocker for code changes

#### Dev Server
⏭️ **SKIPPED** - Will verify manually post-implementation

### 0.3 Repo Map

#### A. PROVIDERS AND CREDITS

**Database Schema & Migrations**
- `supabase/migrations/20251031213236_9e3cba7a-381e-43ed-8e0a-76ec644e989a.sql`
  - Line 41: `CREATE TYPE credit_provider AS ENUM ('lovable', 'openai', 'replicate');`
  - Lines 156-162: Pricing seed data with lovable references
  - **RISK**: Enum modification requires careful migration

**Dependencies**
- `package.json`: Line 104: `lovable-tagger` in devDependencies
- `package-lock.json`: Multiple lovable references

#### B. EDGE FUNCTIONS AND AI CALLS

**Functions using Lovable Gateway** (27 files total):
1. `supabase/functions/generate-image/index.ts` ⭐ CRITICAL
   - Line 288: `LOVABLE_API_KEY` env check
   - Line 341: `https://ai.gateway.lovable.dev/v1/chat/completions`
   - Uses: `google/gemini-3-pro-image-preview` model
2. `supabase/functions/blend-images/index.ts`
3. `supabase/functions/remove-background/index.ts`
4. `supabase/functions/upscale-image/index.ts`
5. `supabase/functions/apply-guided-tweak/index.ts`
6. `supabase/functions/suggest-prompt/index.ts`
7. `supabase/functions/regenerate-prompt/index.ts`
8. `supabase/functions/edit-image/index.ts`
9. `supabase/functions/artie-chat/index.ts`
10. `supabase/functions/analyze-image/index.ts`
11. `supabase/functions/check-brand-consistency/index.ts`
12. `supabase/functions/process-brand-kit/index.ts`
13. `supabase/functions/artie-proactive-analysis/index.ts`
14. `supabase/functions/get-similar-works/index.ts`
15. `supabase/functions/process-brief/index.ts`

**Shared Modules** (need to be updated):
- `supabase/functions/_shared/errors.ts`
- `supabase/functions/_shared/retry.ts`
- `supabase/functions/_shared/idempotency.ts`
- `supabase/functions/_shared/sse.ts`
- `supabase/functions/_shared/generationParams.ts`
- `supabase/functions/_shared/promptEngine.ts`
- `supabase/functions/_shared/observability.ts`
- `supabase/functions/_shared/security.ts`
- `supabase/functions/_shared/rateLimit.ts`

#### C. ARTIE CHAT UI AND LAYOUT

**Main Component** (⭐ LAYOUT FIX TARGET):
- `src/components/ArtieChat.tsx` (2,493 lines)
  - Line 1742-1764: Main panel container (`fixed`, `flex flex-col`)
  - Line 1863-1874: Chat body (scrollable area)
  - Desktop: `max-h-[calc(100vh-2rem)]` - good
  - Mobile: `h-[96dvh]` - good
  - **ISSUE IDENTIFIED**: Need to verify input positioning and flex-1 behavior

**Sub-components**:
- `src/components/SafeArtieChat.tsx`
- `src/components/artie/ArtieQuickActions.tsx`
- `src/components/artie/ArtieFloatingIcon.tsx`
- `src/components/artie/ArtieSettingsPanel.tsx`
- `src/components/artie/ArtieChatInput.tsx`
- `src/components/artie/ArtieMessage.tsx`
- `src/components/artie/ArtieModal.tsx`
- `src/components/artie/ArtieGenerationDialog.tsx`
- `src/components/artie/ArtieImageThumbnail.tsx`
- `src/components/artie/ArtieFloatingAssistant.tsx`
- `src/components/artie/ProactiveSuggestionCard.tsx`

**Hooks**:
- `src/hooks/useProactiveArtie.tsx`

**Pages**:
- `src/pages/ArtiePage.tsx`

#### D. LANDING PAGE ROUTE AND COMPONENTS

**Main Route**:
- `src/pages/Index.tsx` ⭐ REDESIGN TARGET

**Landing Sections** (current):
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/CoreFeaturesSection.tsx`
- `src/components/landing/FeaturedCommunitySection.tsx`
- `src/components/landing/PremiumValue.tsx`
- `src/components/landing/PremiumHero.tsx`
- `src/components/landing/FinalCTASection.tsx`
- `src/components/landing/PremiumFeatures.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/EmotionalValueSection.tsx`
- `src/components/landing/ProofSection.tsx`

#### E. ASSETS LIBRARY AND STORAGE FLOW

**Database Schema**:
- `generated_assets` table (from migration)
  - Stores: analysis, images, prompts
  - RLS policies for user access

**Storage Integration**:
- Supabase Storage bucket for images
- Upload flow in edge functions
- Frontend retrieval via Supabase client

**Frontend Components**:
- `src/components/GeneratedImagesGallery.tsx`
- Image display and management

### 0.4 Risk Assessment

#### HIGH RISK 🔴

**1. Database Enum Migration - credit_provider**
- **Risk**: PostgreSQL enums are immutable; can't simply remove values
- **Impact**: Breaking change if not handled correctly
- **Existing Data**: Unknown if production has lovable transactions
- **Mitigation Strategy**:
  - Option A (Safest): Create new enum, migrate data, swap tables
  - Option B: Convert enum to text with CHECK constraint
  - **Recommended**: Option B for simplicity

**2. Edge Functions Provider Calls**
- **Risk**: 15 edge functions directly call lovable gateway
- **Impact**: Complete service outage if not replaced correctly
- **Dependencies**: All AI features depend on this
- **Mitigation**:
  - Create shared provider client module first
  - Test with one function before rolling out
  - Ensure API response contract remains stable
  - Keep error handling consistent

#### MEDIUM RISK 🟡

**3. Credit Pricing Configuration**
- **Risk**: Pricing table has lovable seed data
- **Impact**: Users might see incorrect pricing
- **Mitigation**: Data migration to update/remove lovable pricing rows

**4. Artie Chat Layout Changes**
- **Risk**: CSS changes can break mobile/desktop rendering
- **Impact**: Chat becomes unusable on some devices
- **Mitigation**: Test on multiple viewport sizes, preserve existing flex structure

**5. Landing Page Redesign**
- **Risk**: Route changes or component removal breaks navigation
- **Impact**: New users can't onboard
- **Mitigation**: Keep route path the same, preserve CTA button targets

#### LOW RISK 🟢

**6. Caricature Tool Addition**
- **Risk**: New feature, no existing dependencies
- **Impact**: Limited to new functionality
- **Mitigation**: Follow existing tool patterns, thorough testing

**7. Package.json Dependencies**
- **Risk**: lovable-tagger removal
- **Impact**: Minimal - appears to be dev tooling
- **Mitigation**: Simple removal, verify no imports

---

### 0.5 Implementation Plan & Commit Sequence

#### Commit Group 1: Remove Lovable Infrastructure (5 commits)
1. **Migration: Modify credit_provider constraint**
   - Convert enum to text with CHECK constraint
   - Migration file only, no code changes
2. **Data: Update pricing configuration**
   - Remove/update lovable pricing rows
   - Add openai/gemini pricing if missing
3. **Shared: Create unified provider client module**
   - New file: `supabase/functions/_shared/providerClient.ts`
   - Supports: OpenAI, Gemini (direct, not via gateway)
   - Stable response contract
4. **Functions: Replace lovable calls (batch 1 of 2)**
   - Update 7-8 functions to use new client
   - Test response parsing
5. **Functions: Replace lovable calls (batch 2 of 2)**
   - Update remaining functions
   - Remove all lovable gateway references

#### Commit Group 2: Artie Chat Layout Fix (2 commits)
6. **Fix: Artie chat container flex behavior**
   - Ensure parent has height constraint
   - Verify min-h-0 on flex children
   - Fix input positioning
7. **Fix: Auto-scroll logic with threshold**
   - Only snap to bottom if within 120px
   - Handle streaming messages correctly

#### Commit Group 3: Landing Page Redesign (3 commits)
8. **Redesign: Landing page hero and structure**
   - New hero with visual element
   - Clean component organization
9. **Redesign: Tools preview and gallery sections**
   - Grid layout for tools
   - Example gallery with filters
10. **Redesign: Trust section and footer**
    - Short bullets for benefits
    - Minimal footer

#### Commit Group 4: Caricature Tool (4 commits)
11. **Backend: Caricature edge function**
    - New function with 4 presets
    - Provider support (openai/gemini)
12. **Backend: Caricature prompt templates**
    - Studio, Editorial, 3D Toy, Sticker presets
    - Strength and style defaults
13. **Frontend: Caricature tool UI**
    - Upload, preset selection, consent checkbox
    - Provider selection
14. **Integration: Caricature in tools navigation**
    - Add to landing tools grid
    - Add to app navigation
    - Assets library integration

#### Commit Group 5: Cleanup (2 commits)
15. **Cleanup: Remove lovable from dependencies**
    - package.json
    - package-lock.json
    - Any lingering references in docs
16. **Cleanup: Type consistency and unused code**
    - Ensure provider types are strict
    - Remove any commented lovable code

**Total Estimated Commits**: 16

---

---

## Phase 1: Architecture & Design Decisions

### 1.1 Provider Model

#### Supported Providers
**FINAL DECISION**: Only OpenAI and Gemini (Google) will be supported
- ✅ `openai` - via OpenAI API directly
- ✅ `gemini` - via Google Gemini API directly
- ❌ `lovable` - REMOVED completely
- ❌ `replicate` - REMOVED (not currently used in practice)

#### Provider Routing Rules
**Default Provider**: `gemini` (currently using `google/gemini-3-pro-image-preview`)
- **Image Generation**: Gemini by default (most cost-effective)
- **Image Editing**: OpenAI DALL-E 3 when editing features required
- **Chat/Analysis**: Gemini (fast, cost-effective)
- **User Override**: Frontend MAY offer provider selection (optional)

#### API Response Contract (UNIFIED)

All edge functions MUST return this exact shape:

```typescript
// SUCCESS Response
{
  success: true,
  image?: string,          // Public URL or base64 data URI
  imageUrl?: string,       // Alternate field name (legacy support)
  assetId?: string,        // Database ID of saved asset
  message?: string,        // User-friendly message
  metadata?: {             // Optional metadata
    model?: string,
    provider?: string,
    generationTime?: number
  }
}

// ERROR Response
{
  success: false,
  error: string,           // User-friendly error message
  errorType?: string,      // Machine-readable error type
  retryable?: boolean,     // Whether client should retry
  requestId?: string       // For support/debugging
}
```

**Contract Rules**:
1. `success` field is REQUIRED in all responses
2. Frontend checks `success`, then looks for `image` OR `imageUrl`
3. Error responses MUST have `error` field with user-friendly message
4. Provider changes MUST NOT change this contract

#### Shared Provider Client Module

New file: `supabase/functions/_shared/providerClient.ts`

**Responsibilities**:
- Centralized API calls to OpenAI and Gemini
- Unified error handling and retry logic
- Response normalization to standard contract
- Rate limiting and timeout management

**Interface**:
```typescript
type ProviderType = 'openai' | 'gemini';

interface ProviderRequest {
  provider: ProviderType;
  action: 'generate' | 'edit' | 'analyze' | 'chat';
  prompt: string;
  image?: string;  // base64 or URL
  options?: Record<string, any>;
}

async function callProvider(request: ProviderRequest): Promise<ProviderResponse>
```

### 1.2 Credits and Pricing

#### Database Schema Changes

**Strategy**: Convert `credit_provider` enum to TEXT with CHECK constraint

**Migration Plan**:
1. Add new TEXT column `provider_type` with CHECK constraint
2. Migrate existing data:
   - `'lovable'` → `'gemini'` (safe assumption: lovable was using gemini)
   - `'openai'` → `'openai'` (unchanged)
   - `'replicate'` → `'gemini'` (fallback)
3. Drop old `credit_provider` enum column
4. Rename `provider_type` to `provider`
5. Add CHECK constraint: `provider IN ('openai', 'gemini')`

**Migration SQL**:
```sql
-- Migration: 20260205_remove_lovable_provider.sql
ALTER TABLE credit_transactions
  ADD COLUMN provider_type TEXT;

UPDATE credit_transactions
  SET provider_type = CASE
    WHEN provider::text = 'lovable' THEN 'gemini'
    WHEN provider::text = 'replicate' THEN 'gemini'
    WHEN provider::text = 'openai' THEN 'openai'
    ELSE 'gemini'
  END;

ALTER TABLE credit_transactions
  DROP COLUMN provider,
  RENAME COLUMN provider_type TO provider,
  ALTER COLUMN provider SET NOT NULL,
  ADD CHECK (provider IN ('openai', 'gemini'));

DROP TYPE IF EXISTS credit_provider;
```

#### Pricing Configuration Updates

**New Pricing** (credits per action):
```sql
DELETE FROM pricing_config WHERE provider = 'lovable' OR provider = 'replicate';

INSERT INTO pricing_config (action, provider, credits, active) VALUES
  ('analyze', 'gemini', 1, true),
  ('generate', 'gemini', 3, true),
  ('generate', 'openai', 7, true),
  ('edit', 'gemini', 2, true),
  ('edit', 'openai', 5, true),
  ('refine', 'gemini', 1, true),
  ('blend', 'gemini', 2, true),
  ('upscale', 'gemini', 2, true),
  ('caricature', 'gemini', 3, true),
  ('caricature', 'openai', 7, true)
ON CONFLICT (action, provider) DO UPDATE
  SET credits = EXCLUDED.credits, active = EXCLUDED.active;
```

**Rationale**:
- Gemini is cheaper → lower credit cost
- OpenAI is premium → higher credit cost
- Maintains user incentive to use cost-effective options

### 1.3 Caricature Tool Design

#### Feature Overview
Transform uploaded portraits into stylized caricatures with 4 distinct artistic presets.

#### Presets and Prompt Templates

**1. Studio Caricature**
```
Base Prompt: "Professional studio caricature portrait with exaggerated features in a polished, clean style. Smooth gradients, warm studio lighting, professional artistic rendering. Features are proportionally exaggerated while maintaining likeness. Clean white or subtle gradient background."

Strength Params:
- continuation_strength: 0.7 (strong reference adherence)
- guidance_scale: 8.0
- quality: "premium"
```

**2. Editorial Caricature**
```
Base Prompt: "Editorial cartoon caricature in bold ink and watercolor style. Expressive linework, vibrant colors, dynamic composition. Exaggerated facial features with satirical artistic flair. Energetic brushstrokes and confident pen work. Signature editorial illustration style."

Strength Params:
- continuation_strength: 0.6 (moderate reference)
- guidance_scale: 9.0
- quality: "premium"
```

**3. 3D Toy Caricature**
```
Base Prompt: "Cute 3D vinyl toy figurine caricature with oversized head and chibi proportions. Smooth plastic material, playful and friendly expression. Bright solid colors, glossy finish. Designer toy aesthetic with exaggerated kawaii features. Studio product photography lighting."

Strength Params:
- continuation_strength: 0.5 (creative freedom)
- guidance_scale: 7.5
- quality: "premium"
```

**4. Sticker Cutout**
```
Base Prompt: "Fun die-cut sticker caricature with bold outlines and flat colors. Simplified features, cheerful expression, slight white border. Vector-style illustration with clean edges. Vibrant pop art colors. Designed for sticker printing with die-cut edge."

Strength Params:
- continuation_strength: 0.55
- guidance_scale: 8.5
- quality: "standard"
```

#### Provider Support
- **Gemini**: All 4 presets (default, 3 credits)
- **OpenAI**: All 4 presets (7 credits)

#### Edge Function Spec

**Endpoint**: `/functions/v1/caricature-image`

**Request**:
```json
{
  "image": "data:image/png;base64,..." or "https://...",
  "preset": "studio" | "editorial" | "toy" | "sticker",
  "provider": "gemini" | "openai",  // optional, defaults to gemini
  "consent": true  // REQUIRED, must be true
}
```

**Response**: Standard contract (same as generate-image)

**Validation Rules**:
1. `consent` MUST be `true` or request is rejected (400 error)
2. `image` MUST be valid data URI or HTTPS URL
3. `preset` MUST be one of the 4 valid presets
4. Image MUST contain detectable face (use analyze-image first)

#### Frontend UI Flow

**Component**: `src/components/CaricatureTool.tsx`

**UI Elements**:
1. **Image Upload** (drag-drop or click)
2. **Preset Selector** (4 cards with preview icons)
3. **Provider Selector** (optional toggle: gemini/openai with credit cost)
4. **Consent Checkbox** (REQUIRED, unchecked by default)
   - Label: "I confirm I have rights to transform this image"
   - Blocking: Generate button disabled unless checked
5. **Generate Button** (shows credit cost based on provider)

**Assets Library Integration**:
- Saves to `generated_assets` table with `action: 'caricature'`
- Displays in user's image gallery with "Caricature" filter tag
- Stores original image reference in `source_urls`

### 1.4 Artie Chat Behavior

#### Layout Constraints (Fix Page Growth)

**Problem Identified**:
Current flex structure allows messages area to grow beyond panel height, causing page scroll.

**Root Cause**:
Missing `min-height: 0` on intermediate flex children or messages growing unconstrained.

**Solution**:
```tsx
// Main Panel Container (already correct)
<div className="fixed ... flex flex-col" style={{ minHeight: 0 }}>

  {/* Header - Fixed Height */}
  <div className="h-14 md:h-16 flex-shrink-0">...</div>

  {/* Quick Actions - Fixed Height */}
  <div className="flex-shrink-0">...</div>

  {/* Chat Body - Scrollable, MUST NOT GROW */}
  <div
    ref={chatBodyRef}
    className="flex-1 overflow-y-auto min-h-0"  // min-h-0 is CRITICAL
    style={{
      maxHeight: '100%',  // Prevent growth
      overflowY: 'auto',  // Internal scroll
      WebkitOverflowScrolling: 'touch'
    }}
  >
    {messages.map(...)}
  </div>

  {/* Input Area - Fixed Height */}
  <div className="flex-shrink-0">...</div>

</div>
```

**CSS Rules**:
- Panel: `fixed`, `flex flex-col`, explicit height constraint
- Header/Actions/Input: `flex-shrink-0` (don't shrink)
- Messages area: `flex-1 overflow-y-auto min-h-0` (grow but scroll internally)
- No child should have `flex-grow` without `min-height: 0`

#### Auto-Scroll Rules and Threshold

**Current Behavior**:
Always scrolls to bottom on new message (line 402-406).

**New Behavior** (Smart Auto-Scroll):

```typescript
const SCROLL_THRESHOLD = 120; // pixels from bottom

const scrollToBottom = (force = false) => {
  if (!chatBodyRef.current) return;

  const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

  // Only auto-scroll if user is near bottom OR force=true
  if (force || distanceFromBottom <= SCROLL_THRESHOLD) {
    chatBodyRef.current.scrollTo({
      top: scrollHeight,
      behavior: 'smooth'
    });
  }
};

// Usage:
// New message from Artie: scrollToBottom(false)  // respects threshold
// User sends message: scrollToBottom(true)       // always scroll
// Streaming update: scrollToBottom(false)        // respects threshold
```

**Behavior Rules**:
1. **User Sends Message**: Always scroll to bottom (force=true)
2. **Artie Responds**: Only scroll if user is within 120px of bottom
3. **Streaming Messages**: Continuously check threshold, scroll if near bottom
4. **User Scrolls Up**: Do NOT snap them back down
5. **New Conversation**: Scroll to bottom on open

**Visual Feedback** (optional enhancement):
- Show "↓ New messages" badge when not auto-scrolling
- Badge click triggers `scrollToBottom(true)`

---

### 1.5 Sample JSON Responses

#### Image Generation Success
```json
{
  "success": true,
  "image": "https://example.supabase.co/storage/v1/object/public/generated-images/user123/12345.png",
  "assetId": "uuid-here",
  "message": "Image generated successfully",
  "metadata": {
    "model": "google/gemini-3-pro-image-preview",
    "provider": "gemini",
    "generationTime": 4523
  }
}
```

#### Caricature Success
```json
{
  "success": true,
  "image": "https://...",
  "assetId": "uuid-here",
  "message": "Caricature created successfully",
  "metadata": {
    "preset": "studio",
    "provider": "gemini"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Insufficient credits. You need 3 credits but have 0.",
  "errorType": "insufficient_credits",
  "retryable": false,
  "requestId": "req_abc123"
}
```

---

### Phase 1 Complete ✅

**Architecture decisions locked down**:
- ✅ Provider model (openai, gemini only)
- ✅ Response contract (unified across all functions)
- ✅ Credits migration strategy (enum → text)
- ✅ Caricature tool spec (4 presets, consent gating)
- ✅ Artie chat layout fix (min-h-0, flex constraints)
- ✅ Auto-scroll logic (120px threshold)

**Next Phase**: Phase 2 - Implementation (16 commits)

Awaiting approval to begin implementation...
