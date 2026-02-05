# Frontend Overhaul Status

## ✅ Completed

1. **Design Token System** - Created `src/styles/tokens.css` with full token system
2. **Tailwind Config Updated** - Mapped to token variables
3. **Unified Modal Architecture** - Created modal components:
   - `ModalShell` - Desktop dialog / Mobile bottom sheet
   - `ModalHeader` - Title, description, close button
   - `ModalBody` - Scrollable content area
   - `ModalFooter` - Sticky footer with actions
   - `ProgressRegion` - Standard progress display
4. **Backend Request Format** - Updated `studioStore.ts` to send new format:
   - `aspect_ratio` instead of `size`
   - `background_mode` instead of `background`
   - `quality` normalized to "standard" | "high"

## 🔄 In Progress / Remaining

### 1. ImageGenerationDialog Refactor
**Current State:** Uses custom modal implementation, 1100+ lines
**Needs:**
- Refactor to use `ModalShell` component
- Ensure controls (quality, aspect ratio, background) are visible and update state
- Use `ProgressRegion` for loading states
- Remove floating loaders

**Key Fixes Needed:**
- Controls must visibly update when changed
- State must be reflected in UI
- Parameters must be sent in new format (✅ done in studioStore)
- All controls must be wired end-to-end

### 2. ARtie UX Rewrite
**Current State:** Verbose, essay-like responses
**Needs:**
- Compact, action-driven format
- Max 3 issues, max 3 actions
- One sentence verdict + quality score
- Action buttons wired to tools
- Remove "What's Wrong", "What to Improve", "Creative Blueprint" sections
- Replace with single "Creative Direction" panel

**Files to Update:**
- `src/components/artie/ArtieMessage.tsx`
- `src/components/ResultsSectionEnhanced.tsx` (or Results components)
- Backend analysis endpoint response format

### 3. Generate in Studio Controls
**Current State:** Controls exist but may not be fully wired
**Needs:**
- Quality dropdown: Must change model params or be removed
- Aspect ratio: Must enforce dimensions
- Background: Must affect output (transparent vs solid)
- All controls must be reversible and observable

**Verification:**
- ✅ Backend now accepts and validates these params
- ⚠️ Frontend needs to ensure UI reflects state changes
- ⚠️ Need to verify controls actually affect generation

### 4. Loading States Consistency
**Current State:** Mixed loading patterns
**Needs:**
- Button-level spinner for actions
- ProgressRegion for long operations
- Remove floating/edge-anchored spinners
- Consistent toast notifications

### 5. Spacing Consistency
**Current State:** Some arbitrary spacing values
**Needs:**
- Refactor components to use token spacing only
- Remove `p-[13px]`, `mt-[18px]` type values
- Use spacing scale: 2, 3, 4, 6, 8 for components
- Use 10, 12, 13 for layout sections

## Next Steps (Priority Order)

1. **Fix Generate Controls** - Ensure quality/aspect/background work end-to-end
2. **Refactor ImageGenerationDialog** - Use ModalShell, fix layout
3. **Rewrite ARtie UX** - Compact, action-driven format
4. **Consistent Loading States** - Use ProgressRegion everywhere
5. **Spacing Audit** - Remove arbitrary values

## Notes

- Backend is ready and accepts new format
- Design tokens are in place
- Modal architecture is ready to use
- Frontend needs incremental refactoring to use new systems
