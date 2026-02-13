# Architecture

**Analysis Date:** 2026-02-13

## Pattern Overview

**Overall:** Layered client-server architecture with React frontend, Supabase backend (PostgreSQL + Edge Functions), and Deno-based serverless processing.

**Key Characteristics:**
- Frontend-heavy SPA with lazy-loaded routes and code splitting
- Client-side state management via custom Zustand-like stores + React Context
- Server-side workloads executed via Supabase Edge Functions (Deno runtime)
- Real-time capabilities through Supabase client with streaming SSE support
- Token-based credit system for API rate limiting and feature access

## Layers

**Presentation Layer (Frontend):**
- Purpose: User-facing React components and pages
- Location: `src/components/`, `src/pages/`
- Contains: Page layouts (33 routes), UI components (77 root-level components + nested subdirectories), dialogs, modals
- Depends on: Hooks, contexts, state management, utilities
- Used by: React Router for routing

**State Management Layer:**
- Purpose: Centralized state for canvas, studio, modals, and preferences
- Location: `src/store/`
- Contains: `canvasStore.ts` (project/canvas/item state with undo/redo), `studioStore.ts`, `unifiedModalStore.ts`, `imageSelectionStore.ts`
- Depends on: React's `useSyncExternalStore`, TypeScript types
- Used by: Components for reading/writing application state

**Context & Hooks Layer:**
- Purpose: Shared authentication, permissions, and reusable component logic
- Location: `src/contexts/`, `src/hooks/`
- Contains: `AuthContext.tsx` (user session, sign in/out), `ToolsModalContext.tsx`, 40+ custom hooks (`useArtieCore.ts`, `useCredits.tsx`, `useFeatureAccess.tsx`, etc.)
- Depends on: Supabase client, React Query, state stores
- Used by: Components and other hooks

**Integration Layer:**
- Purpose: External service connections
- Location: `src/integrations/supabase/`
- Contains: `client.ts` (Supabase client initialization with environment validation), `types.ts` (auto-generated database types from Supabase)
- Depends on: @supabase/supabase-js
- Used by: Contexts, hooks, components for database access

**Utilities & Services Layer:**
- Purpose: Business logic, image processing, analytics, request optimization
- Location: `src/lib/`
- Contains:
  - Analytics: `analytics.ts`
  - Image processing: `imageOptimization.ts`, `imageEditing/`
  - Prompt engineering: `artieSystemPrompt.ts`, `promptSimilarity.ts`
  - Edge function client: `edgeFunctionClient.ts`, `edgeFunctionHealth.ts`
  - Data persistence: `saveAsset.ts`
  - Performance: `requestDeduplication.ts`, `requestOptimization.ts`, `performanceMonitoring.ts`
  - Observability: `sentry.ts`
- Depends on: Supabase, external APIs, React Query
- Used by: Components, hooks, contexts

**Backend Layer (Edge Functions):**
- Purpose: Serverless processing for image generation, AI analysis, payment handling
- Location: `supabase/functions/`
- Contains: 30+ edge function endpoints organized by domain (generate-image, analyze-image, artie-chat, blend-images, caricature-image, etc.)
- Depends on: Deno standard library, third-party AI providers (OpenAI, Replicate, etc.), Supabase JS client
- Used by: Frontend via `callEdgeFunction` from `edgeFunctionClient.ts`

**Shared Backend Utilities:**
- Purpose: Cross-function concerns for edge functions
- Location: `supabase/functions/_shared/`
- Contains: `providerClient.ts` (AI provider abstraction), `promptEngine.ts` (prompt building), `errors.ts` (standardized errors), `observability.ts` (logging), `security.ts` (input validation), `rateLimit.ts`, `retry.ts`, `validation.ts`, `idempotency.ts`
- Used by: All edge functions

## Data Flow

**Image Generation Flow:**

1. User uploads image or enters prompt in `Index.tsx` → `UploadSection` component
2. Component calls `callEdgeFunction('generate-image', {...params})` from `src/lib/edgeFunctionClient.ts`
3. Edge function `supabase/functions/generate-image/index.ts`:
   - Validates params via `validateGenerationParams()` from `_shared/generationParams.ts`
   - Builds prompt via `buildPrompt()` from `_shared/promptEngine.ts`
   - Calls AI provider via `callProvider()` from `_shared/providerClient.ts`
   - Sends SSE progress events (streaming mode) or JSON response
4. Frontend receives response via `useStreamingGeneration.ts` hook
5. Generated image stored in Supabase storage, metadata in `generated_assets` table
6. Component displays image via `GeneratedImagesGallery.tsx`

**Authentication & Authorization Flow:**

1. User navigates to `/auth` → `Auth.tsx` page
2. Auth form calls Supabase `auth.signUp()` or `auth.signIn()`
3. `AuthContext.tsx` maintains session state via `supabase.auth.onAuthStateChange()`
4. Protected routes check `useAuth()` hook; redirect to `/auth` if not authenticated
5. Feature access checked via `useFeatureAccess.tsx` which calls `check-feature-access` edge function
6. Credits deducted via `deduct-credits` edge function before operations

**Canvas/Project Flow:**

1. User navigates to `/canvas` → `CanvasPage.tsx`
2. Page loads projects from `canvasStore.ts` (client-side state management)
3. Canvas items rendered via `Canvas` component with interactive drag-drop (`@dnd-kit/core`)
4. Changes trigger `recordAction()` in store for undo/redo support
5. On save, `saveAsset.ts` syncs state to Supabase database

**Artie (AI Assistant) Flow:**

1. User opens Artie in `ArtieChat.tsx` component
2. Message submitted calls `useArtieCore.ts` hook
3. Hook invokes `artie-chat` edge function with message + conversation history
4. Backend processes via `_shared/promptEngine.ts` + AI provider
5. Response streamed back via SSE
6. `ArtieChat` component appends message to conversation state

**State Management:**

- **AuthContext:** Manages user session, prefetches profile and generated assets on login
- **Canvas Store:** Tracks projects, canvases, items, selection, zoom, pan, undo/redo stack
- **Studio Store:** Manages tool state, generation parameters, UI state
- **React Query:** Caches API responses (10min staleTime, 60min gcTime by default per `App.tsx`)

## Key Abstractions

**EdgeFunctionClient:**
- Purpose: Unified interface for calling Supabase edge functions with retry logic
- Examples: `src/lib/edgeFunctionClient.ts`
- Pattern: Exponential backoff retry, error categorization (CORS, schema cache, auth, rate limit, server), user-friendly error messages via toast

**PromptEngine:**
- Purpose: Centralized prompt building and enhancement logic
- Examples: `supabase/functions/_shared/promptEngine.ts`, `src/lib/artieSystemPrompt.ts`
- Pattern: Compose prompts from templates, user input, brand kit, smart defaults; serialize for API calls

**ProviderClient:**
- Purpose: Abstract away multiple AI providers (OpenAI, Replicate, etc.)
- Examples: `supabase/functions/_shared/providerClient.ts`
- Pattern: Single `callProvider()` function detects provider from env config, handles provider-specific auth and request formatting

**Store Pattern (Custom Zustand-like):**
- Purpose: Lightweight client-side state without external library overhead
- Examples: `src/store/canvasStore.ts`
- Pattern: External store with `useSyncExternalStore`, selector hooks, listener subscriptions

**Request Deduplication:**
- Purpose: Avoid duplicate API calls for same parameters
- Examples: `src/lib/requestDeduplication.ts`
- Pattern: Cache requests in-flight, return same promise if duplicate received

## Entry Points

**Frontend Entry:**
- Location: `src/main.tsx`
- Triggers: Vite dev server or production bundle execution
- Responsibilities:
  - Initialize React root with error handling
  - Register service worker for offline capability
  - Async load Sentry (non-blocking)
  - Render App component

**App Root:**
- Location: `src/App.tsx`
- Triggers: Called by main.tsx
- Responsibilities:
  - Set up providers (Query, Theme, Router, Auth, Modals)
  - Define all routes (33 total)
  - Configure QueryClient with aggressive caching
  - Render global UI (bottom nav, online indicator, modals)

**Page Routes:**
- Location: `src/pages/` (33 files)
- Triggers: Browser navigation via React Router
- Examples:
  - `Index.tsx` - Main landing/studio (largest component, ~1000+ lines)
  - `Dashboard.tsx` - User project gallery
  - `CanvasPage.tsx` - Canvas editor
  - `ArtiePage.tsx` - AI assistant interface
  - `Settings.tsx` - User preferences

**Edge Function Endpoints:**
- Location: `supabase/functions/*/index.ts`
- Triggers: `callEdgeFunction()` from frontend
- Examples:
  - `generate-image` - Streaming image generation with SSE progress
  - `artie-chat` - Conversational AI with prompt enhancement
  - `analyze-image` - Visual analysis via Claude Vision API
  - `deduct-credits` - Atomic credit deduction before operations
  - `subscription-webhook` - Stripe webhook processing

## Error Handling

**Strategy:** Layered approach with automatic retry, fallback UI, and user-friendly messaging

**Patterns:**

1. **Network/Transient Errors:** Automatic retry with exponential backoff via `edgeFunctionClient.ts` (up to 3 attempts by default)
2. **API Errors:** Categorized by type (CORS, auth, rate limit, server, client) and mapped to recovery actions
3. **Validation Errors:** Input sanitization via `sanitize.ts`, schema validation via `validateGenerationParams()` in edge functions
4. **Auth Errors:** Automatic redirect to `/auth` if session invalid
5. **Component Errors:** `ErrorBoundary.tsx` catches React rendering errors, displays fallback UI
6. **Feature Access Errors:** `check-feature-access` edge function determines if user can use feature, returns 403 if not
7. **Credit Insufficient:** Operations blocked before execution via `useCredits.tsx` hook

**Error Types:**

- Schema cache errors (retryable) - service initializing
- CORS errors (retryable) - network config issue
- Rate limit errors (retryable, 429 status)
- Auth errors (non-retryable) - must re-authenticate
- Client errors 4xx (non-retryable)
- Server errors 5xx (retryable)

## Cross-Cutting Concerns

**Logging:**
- Frontend: `console.log` with request IDs for tracing
- Backend: `createLogger()` from `_shared/observability.ts` in edge functions
- Centralized via Sentry (`src/lib/sentry.ts`) for error tracking

**Validation:**
- Frontend: React Hook Form with Zod schemas for user input
- Backend: `validation.ts` and `security.ts` in edge functions sanitize and validate all inputs

**Authentication:**
- Supabase Auth (email/password + OAuth)
- Session stored in localStorage, auto-refreshed via `persistSession: true`
- RLS (Row Level Security) policies enforced in Supabase tables

**Authorization:**
- Feature gating via `useFeatureAccess.tsx` + `check-feature-access` edge function
- Credit-based rate limiting tracked in `user_credits` table
- Role-based checks (admin flag in user profile)

**Performance Optimization:**
- Code splitting via lazy() in routes
- Image optimization via `imageOptimization.ts` (resize, compress for analysis)
- Request deduplication via `requestDeduplication.ts`
- Query caching via React Query (10min stale, 60min cache)
- Service worker for offline support

**Observability:**
- Page view tracking via `usePageViewTracking.tsx`
- Analytics via Mixpanel (`analytics.ts`)
- Error tracking via Sentry (async, non-blocking)
- Performance monitoring via `performanceMonitoring.ts`

---

*Architecture analysis: 2026-02-13*
