# Testing Checklist - Artie CIS & Studio Simplification

## Phase 0: Setup ✅
- [x] Branch created: `feature/artie-cis-and-studio-simplify`
- [x] Code compiles without errors
- [x] No new linting errors introduced

## Phase 1: Standalone Artie CIS Page

### Test `/artie` Route
- [ ] Navigate to `/artie` route
- [ ] Page loads with Header and Footer
- [ ] Centered UI displays:
  - [ ] Large "Artie" title with "Creative Intelligent System" subtitle
  - [ ] Description text
  - [ ] Large chat interface in the center
- [ ] Chat input works:
  - [ ] Can type messages
  - [ ] Can upload files (images, PDF, DOCX)
  - [ ] Messages appear in chat history
  - [ ] Artie responds to messages

### Test Tool Integration from ArtiePage
- [ ] Ask Artie to "Generate an image" → Opens Studio with prompt
- [ ] Ask Artie to "Upscale this image" → Opens upscale tool
- [ ] Ask Artie to "Blend these images" → Opens blend tool
- [ ] Verify tools use correct context (prompts, images)

### Test File Upload
- [ ] Upload an image → Should be processed and added to context
- [ ] Upload a PDF/DOCX brief → Should be analyzed
- [ ] Brief analysis should appear in chat

## Phase 2: Simplified "Generate in Studio" Modal

### Test Simplified Modal
- [ ] Open "Generate in Studio" from any entry point
- [ ] Verify tabs are REMOVED:
  - [ ] No "Templates" tab
  - [ ] No "Presets" tab
  - [ ] No "Custom Prompt" tab
- [ ] Verify simplified layout:
  - [ ] Left side: Image preview (if reference image exists)
  - [ ] Right side: "Your Base Prompt" section with:
    - [ ] Prompt textarea
    - [ ] Enhance button
    - [ ] Simplify button
    - [ ] Artistic button
  - [ ] Advanced Options collapsible section (Quality, Size, Background)

### Test Generation Flow
- [ ] Enter a prompt in "Your Base Prompt"
- [ ] Click "Generate" button
- [ ] Image generates successfully
- [ ] Generated image appears in left panel
- [ ] Only basePrompt is used (no preset merging)

## Phase 3: Disabled Custom Presets

### Test Presets Route
- [ ] Navigate to `/presets`
- [ ] Should show placeholder message:
  - [ ] "Presets Temporarily Unavailable"
  - [ ] "This feature is paused while we rebuild it..."
  - [ ] "Go to Studio" button works

### Test UI for Preset Removal
- [ ] Check Header navigation - no "Presets" link
- [ ] Check Footer - no preset references
- [ ] Generate in Studio modal - no preset carousels/chips
- [ ] No "Save as preset" actions visible

## Phase 4: Studio Onboarding Copy

### Test Studio Page
- [ ] Navigate to `/` (Studio page)
- [ ] Above image dropzone, verify:
  - [ ] "Studio" title appears
  - [ ] Description: "Upload a visual, layout, or campaign asset. Artie will analyse it..."
  - [ ] Copy is readable and styled correctly
  - [ ] Works on mobile and desktop

## Phase 5: My Projects Save Flow (Runtime Testing)

### Test Image Generation Save
- [ ] Generate an image from Studio
- [ ] Wait a few seconds
- [ ] Navigate to `/history` (My Projects)
- [ ] Verify image appears in history with:
  - [ ] Correct prompt
  - [ ] Correct action ("generate")
  - [ ] Correct timestamp
  - [ ] Image displays correctly

### Test Edit Save
- [ ] Edit an image using Edit tool
- [ ] Navigate to `/history`
- [ ] Verify edited image appears with action "edit"

### Test Upscale Save
- [ ] Upscale an image
- [ ] Navigate to `/history`
- [ ] Verify upscaled image appears with action "upscale"

### Test Blend Save
- [ ] Blend two images
- [ ] Navigate to `/history`
- [ ] Verify blended image appears with action "blend"

### Test Save from Artie
- [ ] Ask Artie to generate an image (inline)
- [ ] Navigate to `/history`
- [ ] Verify image appears in history

## Phase 6: Artie CIS Orchestration

### Test Artie Context Awareness
- [ ] Start conversation with Artie about a project
- [ ] Upload images during conversation
- [ ] Ask Artie to work with "the image I uploaded" → Should reference correct image
- [ ] Verify Artie remembers conversation context

### Test Brief Analysis
- [ ] Upload a PDF/DOCX brief to Artie
- [ ] Artie should analyze and summarize brief
- [ ] Ask Artie to "create visuals based on this brief" → Should open Studio with relevant prompt

### Test Tool Orchestration
- [ ] Have Artie generate an image
- [ ] Ask Artie to "create a variation" → Should open Edit tool
- [ ] Ask Artie to "upscale that" → Should open Upscale tool
- [ ] Verify context (images, prompts) is passed correctly between tools

## Common Issues to Watch For

- [ ] Console errors (check browser console)
- [ ] Images not loading
- [ ] Tool modals not opening
- [ ] Save toast messages appearing (or not appearing)
- [ ] Navigation issues
- [ ] Mobile responsiveness
- [ ] Styling issues (dark/light mode)

## Manual Testing Commands

```bash
# Start dev server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

## Known Issues / TODOs

- ArtiePage tool call handling is simplified - may need refinement for complex scenarios
- Brief analysis in ArtiePage is placeholder - needs full implementation
- Save flow audit requires runtime testing to verify database writes are working

