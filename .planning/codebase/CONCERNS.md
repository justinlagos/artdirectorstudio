# Codebase Concerns

**Analysis Date:** 2026-02-13

## Tech Debt

**Excessive Use of `any` Type:**
- Issue: 223+ instances of `any` type used throughout codebase, reducing type safety
- Files:
  - `src/components/ArtieChat.tsx` (line ~79)
  - `src/contexts/ToolsModalContext.tsx` (lines 11, 43, 47)
  - `src/contexts/AuthContext.tsx` (line 11, 12)
  - `src/hooks/useArtieCore.ts` (line 79)
  - `src/lib/intelligence/proactiveAssistance.ts` (lines 77, 152, 175, 205, 231)
  - `src/lib/intelligence/userBehavior.ts` (line 98)
  - Multiple UI and utility files
- Impact: Makes refactoring dangerous, increases bug potential, reduces IDE autocomplete effectiveness
- Fix approach: Create proper TypeScript interfaces for all data structures, especially around Artie context memory and API responses. Start with high-impact files like `ArtieChat.tsx` and `useArtieCore.ts`

**Hardcoded Auth Token Key:**
- Issue: Auth token key hardcoded to old Supabase project ID: `sb-vsbjxktlrbfxfhxiqzlr-auth-token`
- Files: `src/contexts/ToolsModalContext.tsx` (line 65)
- Impact: Uses old project reference even though `.env` shows new project `gpyxglipegxukulmqykv`. This is stale and may fail
- Fix approach: Replace hardcoded token key with dynamic lookup using current project ID from environment or implement proper auth state checking via Supabase SDK instead of localStorage inspection

**Large Monolithic Components:**
- Issue: Components exceed 2500 lines, making them difficult to maintain and test
- Files:
  - `src/components/ArtieChat.tsx` (2515 lines)
  - `src/components/BatchProcessDialog.tsx` (1764 lines)
  - `src/hooks/useArtieCore.ts` (1448 lines)
  - `src/components/ImageGenerationDialog.tsx` (1116 lines)
  - `src/pages/Index.tsx` (968 lines)
- Impact: Hard to understand, modify, and test. Increases cognitive load and bug likelihood
- Fix approach: Break down into smaller, focused components. For example, split `ArtieChat.tsx` into separate files for message rendering, input handling, and tool dialogs

**Excessive useEffect Hooks:**
- Issue: `ArtieChat.tsx` has 15+ useEffect calls creating complex interdependencies
- Files: `src/components/ArtieChat.tsx` (lines 146, 154, 200, 364, 370, 375, 384, 421, 432, 442, 544, 555, 578, 589)
- Impact: Difficult to reason about side effects, potential race conditions, hard to debug
- Fix approach: Consolidate related effects, use custom hooks to group related state/effects, add effect dependency documentation

**Inconsistent Error Handling:**
- Issue: Try-catch blocks with silent failures (catch statements that do nothing)
- Files: `src/hooks/useArtieCore.ts` (lines 90, 107) uses empty catch blocks
- Impact: Bugs silently fail with no visibility, making debugging production issues harder
- Fix approach: Log all caught errors, categorize them (recoverable vs fatal), and provide appropriate user feedback

## Known Bugs

**Session Storage State Mismatch:**
- Symptoms: Context memory or conversation history may be out of sync between tab refreshes
- Files:
  - `src/components/ArtieChat.tsx` (lines 81-94 for context memory initialization)
  - `src/hooks/useArtieCore.ts` (lines 46-62 for conversation loading)
- Trigger: Browser refresh while chat is active, particularly if state is being updated asynchronously
- Cause: State is restored from sessionStorage but not validated against database state, leading to stale data
- Workaround: Full page refresh or clear browser session storage manually

**Editor State Cleanup Bug:**
- Symptoms: ImageEditor may open automatically or show previous image when closing and reopening
- Files: `src/components/ArtieChat.tsx` (lines 2440-2450)
- Cause: Comment at line 2442 indicates prior instant-open bug on desktop. setTimeout workaround exists but may be fragile
- Impact: Poor user experience, potential confusion
- Safe fix: Use proper state machine for editor open/close with explicit cleanup

**Hardcoded Supabase Project Reference:**
- Symptoms: Auth token lookup fails silently if user never authenticated in old project
- Files: `src/contexts/ToolsModalContext.tsx` (line 65)
- Trigger: New users or users on new Supabase project
- Workaround: None - relies on old auth token key existing

## Security Considerations

**Environment Variable Exposure in Client:**
- Risk: Supabase keys are in `.env` and committed to git (publishable key is safe, but project ID is exposed)
- Files: `.env` contains `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Current mitigation: Vite prefixes with `VITE_` which makes them intentionally public (standard practice)
- Recommendations:
  - Ensure `.env.local` is in `.gitignore` for any non-public secrets
  - Use proper environment-specific configs for production
  - No sensitive API keys should be in client code

**localStorage Usage for Auth State:**
- Risk: localStorage persists even with private browsing off on some browsers, exposed to XSS attacks
- Files: `src/contexts/ToolsModalContext.tsx` (line 65), `src/integrations/supabase/client.ts` (line 87)
- Current mitigation: Using Supabase SDK which handles secure storage
- Recommendations:
  - Rely on Supabase SDK for auth management rather than manual localStorage inspection
  - Avoid storing sensitive data in localStorage
  - Implement Content Security Policy headers
  - Add XSS protection validation on all user inputs

**File Upload Validation:**
- Risk: User-uploaded files are validated only by MIME type on client side
- Files: `src/components/BatchProcessDialog.tsx` (lines 92-99)
- Current mitigation: File type checking prevents most invalid uploads
- Recommendations:
  - Add server-side validation of uploaded files
  - Implement file size limits
  - Scan uploads for malicious content
  - Validate image dimensions/format after upload

## Performance Bottlenecks

**SessionStorage Serialization on Every Message:**
- Problem: Full conversation history serialized and written to sessionStorage after each message
- Files: `src/hooks/useArtieCore.ts` (lines 180-184)
- Cause: useEffect with `messages` dependency saves entire array
- Impact: Slows down chat as conversation grows, especially on mobile. Can cause jank
- Improvement path:
  - Implement differential updates (only save new messages)
  - Use IndexedDB for larger data
  - Implement pagination for conversation history

**Context Memory Not Paginated:**
- Problem: All images and documents loaded into memory at once
- Files: `src/hooks/useArtieCore.ts` (lines 136-177)
- Impact: Memory usage grows with user history, affects performance after many uploads
- Improvement path: Implement pagination, lazy loading, or virtual scrolling for context memory

**Unoptimized API Calls:**
- Problem: `useArtieCore.ts` makes multiple calls to load user preferences on every mount
- Files: `src/hooks/useArtieCore.ts` (lines 91-107, 122-133)
- Cause: Two separate imports of `getUserPreferences` (dynamic imports) and sequential calls
- Impact: Increased latency, network congestion
- Improvement path: Cache preferences, consolidate calls, use React Query

**Edge Function Retry Delay:**
- Problem: Fixed 1-10 second backoff for transient errors may be too aggressive
- Files: `src/lib/edgeFunctionClient.ts` (lines 254-261)
- Impact: User-facing delay on failures, poor experience during Supabase issues
- Improvement path: Implement adaptive backoff, add user feedback during retries

## Fragile Areas

**Artie Chat Message Processing Pipeline:**
- Files: `src/components/ArtieChat.tsx` (lines 854+), `src/hooks/useArtieCore.ts`
- Why fragile:
  - Complex streaming response handling with tool calls
  - Multiple message state mutations
  - Async operations without proper cancellation
  - 15+ parallel useEffects with interdependencies
- Safe modification:
  - Add comprehensive unit tests for message parsing
  - Use TypeScript strict mode
  - Implement proper cleanup in useEffect cleanup functions
  - Create state machine for message lifecycle
- Test coverage gaps: No tests for message streaming, tool call handling, or error recovery

**Image Upload and Storage Integration:**
- Files: `src/lib/saveAsset.ts`, `src/components/ArtieChat.tsx` (lines 896-910)
- Why fragile:
  - Complex blob conversion logic (base64, URLs, Files)
  - Fallback upload paths may create duplicates
  - No deduplication of already-uploaded images
  - Storage path structure mixed with RLS logic
- Safe modification:
  - Extract storage logic to separate service
  - Add idempotency keys to prevent duplicates
  - Implement transaction-like behavior
- Test coverage gaps: No tests for blob conversion, storage upload fallbacks, or path generation

**Edge Function Network Calls:**
- Files: `src/components/ArtieChat.tsx` (lines 1139-1260), `src/hooks/useArtieCore.ts` (lines 919+)
- Why fragile:
  - Raw fetch calls with minimal error handling
  - Retry logic mixed in with request logic
  - Stream parsing assumes specific response format
  - No timeout handling for long operations
- Safe modification:
  - Use `callEdgeFunction` or `callEdgeFunctionSafe` consistently
  - Add request/response validation
  - Implement proper timeout handling
- Test coverage gaps: No tests for network failures, timeout handling, or malformed responses

**Context Memory State Management:**
- Files: `src/hooks/useArtieCore.ts` (lines 80, 136-177, 217-260)
- Why fragile:
  - State split between sessionStorage, memory, and database
  - No synchronization strategy between sources
  - Complex loading logic with race conditions possible
  - No validation of loaded context data
- Safe modification:
  - Create single source of truth (database)
  - Implement proper conflict resolution
  - Add data validation schema
- Test coverage gaps: No tests for state reconciliation or concurrent updates

## Scaling Limits

**Conversation History Growth:**
- Current capacity: sessionStorage typically 5-10MB, conversations stored as JSON arrays
- Limit: After ~5000 messages, browser performance degrades significantly
- Scaling path:
  - Migrate to IndexedDB for large conversations
  - Implement server-side conversation storage with pagination
  - Archive old conversations

**Image Context Memory:**
- Current capacity: All user images loaded into state on mount
- Limit: 1000+ images will cause memory bloat and slow app start
- Scaling path:
  - Implement virtual scrolling for image gallery
  - Lazy load images with pagination
  - Use database-backed image index instead of state

**Concurrent User Operations:**
- Current capacity: Single message queue, no parallel requests
- Limit: User must wait for generation to complete before next operation
- Scaling path:
  - Implement proper request queue with priority
  - Allow batch operations
  - Add operation cancellation support

## Dependencies at Risk

**Deprecated or Heavily Patched Dependencies:**
- @playwright/test `^1.56.1` - Testing library bundled as dependency (unusual)
  - Risk: Adds ~50MB to node_modules for a dev dependency in production list
  - Impact: Increases bundle size, creates maintenance overhead
  - Migration plan: Move to devDependencies only

**Long Dependency Chain:**
- Risk: Many UI component libraries (@radix-ui/*, @dnd-kit/*) add significant bundle size
- Impact: Initial load time, especially on mobile
- Monitoring: Watch bundlesize metrics, consider code splitting

## Test Coverage Gaps

**No E2E Tests for Core Workflows:**
- What's not tested:
  - Complete chat flow (send message → stream response → save asset)
  - Image upload and processing
  - Tool invocation (blend, upscale, generate)
  - Error recovery paths
- Files: Core workflow logic in `src/components/ArtieChat.tsx`, `src/hooks/useArtieCore.ts`
- Risk: Regressions in main user workflows go undetected
- Priority: High - these are revenue-critical paths

**Insufficient Unit Tests:**
- What's not tested:
  - Edge function client retry logic
  - Message parsing and tool call handling
  - Context memory loading and synchronization
  - Error messages and user feedback
- Files: Only 4 test files found (`sanitize.test.ts`, `notifications.test.ts`, `requestDeduplication.test.ts`, `instructionGenerator.test.ts`)
- Risk: Hidden bugs in utility functions
- Priority: Medium - incrementally improve coverage

**Missing Integration Tests:**
- What's not tested:
  - Supabase auth flow
  - Storage upload integration
  - Database queries and updates
  - API response parsing
- Files: No dedicated integration test suite
- Risk: Breaking changes to API signatures go undetected
- Priority: Medium - implement before major refactors

**No Performance Tests:**
- What's not tested:
  - Component render performance
  - Memory leaks in long-running sessions
  - Storage operations latency
- Files: No performance benchmarking
- Risk: Performance regressions ship to production undetected
- Priority: Low-Medium - add after fixing critical issues

---

*Concerns audit: 2026-02-13*
