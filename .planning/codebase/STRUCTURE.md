# Codebase Structure

**Analysis Date:** 2026-02-13

## Directory Layout

```
/Users/Justin/artdirectorstudio/
├── src/                           # React frontend application
│   ├── components/                # Reusable React components (93 total)
│   │   ├── ui/                    # shadcn/ui primitive components (30+)
│   │   ├── canvas/                # Canvas editor components (16 files)
│   │   ├── artie/                 # AI assistant components (13 files)
│   │   ├── admin/                 # Admin dashboard components (12 files)
│   │   ├── edit-image/            # Image editing tools (10 files)
│   │   ├── landing/               # Landing page sections (11 files)
│   │   ├── brand/                 # Brand kit components (5 files)
│   │   ├── campaign/              # Campaign builder (5 files)
│   │   ├── community/             # Community gallery (4 files)
│   │   ├── presets/               # Preset management (3 files)
│   │   ├── showcase/              # Portfolio showcase (2 files)
│   │   ├── skeletons/             # Loading skeletons (2 files)
│   │   ├── overlay/               # Overlay dialogs (2 files)
│   │   └── [individual].tsx       # Root-level components (77 files)
│   ├── pages/                     # Route pages (33 files)
│   │   ├── Index.tsx              # Main studio/landing page
│   │   ├── Auth.tsx               # Sign in/sign up
│   │   ├── Dashboard.tsx          # User project gallery
│   │   ├── CanvasPage.tsx         # Canvas editor page
│   │   ├── ArtiePage.tsx          # AI assistant page
│   │   ├── Admin.tsx              # Admin dashboard
│   │   ├── Settings.tsx           # User settings
│   │   ├── Community.tsx          # Community gallery
│   │   ├── Discover.tsx           # Discovery page
│   │   ├── SharedAsset.tsx        # Public share pages
│   │   ├── FunBox.tsx             # Fun lab tools
│   │   ├── [others].tsx           # Policy, billing, auth flow pages
│   ├── store/                     # Client-side state management
│   │   ├── canvasStore.ts         # Canvas projects/items/undo state
│   │   ├── studioStore.ts         # Studio generation parameters
│   │   ├── unifiedModalStore.ts   # Global modal visibility
│   │   ├── visualContextStore.ts  # Visual context for generation
│   │   ├── imageSelectionStore.ts # Selected images for batch ops
│   │   └── modalStore.ts          # Modal state helpers
│   ├── contexts/                  # React Context providers
│   │   ├── AuthContext.tsx        # User auth state + prefetching
│   │   └── ToolsModalContext.tsx  # Tools modal visibility state
│   ├── hooks/                     # Custom React hooks (40+ files)
│   │   ├── canvas/                # Canvas-specific hooks (9 files)
│   │   ├── useArtieCore.ts        # AI conversation state
│   │   ├── useCredits.tsx         # User credit tracking
│   │   ├── useFeatureAccess.tsx   # Feature gating
│   │   ├── useUserPreferences.tsx # User settings/preferences
│   │   ├── useStreamingGeneration.ts # SSE streaming handler
│   │   ├── useGlobalKeyboardShortcuts.tsx # App-wide shortcuts
│   │   ├── use[Other].ts          # 30+ specialized hooks
│   ├── lib/                       # Utility functions and services (40+ files)
│   │   ├── artie/                 # AI logic (7 files)
│   │   ├── imageEditing/          # Image manipulation (4 files)
│   │   ├── intelligence/          # Smart defaults (11 files)
│   │   ├── utils/                 # Helper functions (3 files)
│   │   ├── stubs/                 # Placeholder implementations (2 files)
│   │   ├── actions/               # Server action stubs (1 file)
│   │   ├── edgeFunctionClient.ts  # Unified edge function caller
│   │   ├── edgeFunctionHealth.ts  # Health checking for functions
│   │   ├── analytics.ts           # Mixpanel integration
│   │   ├── imageOptimization.ts   # Image resizing/compression
│   │   ├── saveAsset.ts           # Asset persistence to Supabase
│   │   ├── sentry.ts              # Error tracking setup
│   │   ├── serviceWorker.ts       # Offline support
│   │   ├── performanceMonitoring.ts # Perf metrics
│   │   ├── requestDeduplication.ts # Request caching
│   │   ├── requestOptimization.ts # Request batching
│   │   ├── sanitize.ts            # Input sanitization
│   │   └── [other].ts             # 10+ utility modules
│   ├── types/                     # TypeScript definitions
│   │   ├── canvas.ts              # Canvas/project types
│   │   └── userPreferences.ts     # User preference types
│   ├── integrations/              # External service clients
│   │   └── supabase/              # Supabase configuration
│   │       ├── client.ts          # Supabase client init + env validation
│   │       └── types.ts           # Auto-generated database types
│   ├── styles/                    # Global styles
│   │   └── [themes].css
│   ├── App.tsx                    # Root app component with routing
│   ├── main.tsx                   # Entry point (React root init)
│   ├── App.css                    # App-level styles
│   ├── index.css                  # Global CSS (Tailwind + custom)
│   └── vite-env.d.ts             # Vite type definitions
│
├── supabase/                      # Backend serverless functions & migrations
│   ├── functions/                 # Edge functions (30+ endpoints)
│   │   ├── _shared/               # Shared utilities across functions
│   │   │   ├── providerClient.ts  # AI provider abstraction layer
│   │   │   ├── promptEngine.ts    # Prompt building & serialization
│   │   │   ├── generationParams.ts # Parameter validation & normalization
│   │   │   ├── errors.ts          # Error standardization & mapping
│   │   │   ├── observability.ts   # Logging & monitoring
│   │   │   ├── security.ts        # Input validation & sanitization
│   │   │   ├── rateLimit.ts       # Request rate limiting
│   │   │   ├── validation.ts      # Schema validation helpers
│   │   │   ├── retry.ts           # Retry logic with backoff
│   │   │   ├── idempotency.ts     # Idempotent request handling
│   │   │   ├── sse.ts             # Server-sent events formatting
│   │   │   └── thumbnails.ts      # Image thumbnail generation
│   │   ├── generate-image/        # Primary image generation
│   │   │   └── index.ts           # Calls AI provider, returns SSE/JSON
│   │   ├── artie-chat/            # AI conversation endpoint
│   │   ├── analyze-image/         # Visual analysis via Claude
│   │   ├── apply-guided-tweak/    # Apply AI-suggested edits
│   │   ├── regenerate-prompt/     # Enhance prompts via AI
│   │   ├── blend-images/          # Image blending
│   │   ├── upscale-image/         # Image upscaling
│   │   ├── remove-background/     # BG removal
│   │   ├── caricature-image/      # Caricature generation
│   │   ├── edit-image/            # General image editing
│   │   ├── get-similar-works/     # Similarity search
│   │   ├── process-brand-kit/     # Parse brand guidelines
│   │   ├── process-brief/         # Parse design briefs
│   │   ├── check-feature-access/  # Feature gating logic
│   │   ├── deduct-credits/        # Atomic credit deduction
│   │   ├── create-checkout-session/ # Stripe payment setup
│   │   ├── subscription-webhook/  # Stripe webhook handler
│   │   ├── send-image-email/      # Email asset delivery
│   │   ├── send-notification-email/ # Transactional emails
│   │   ├── reset-daily-usage/     # Scheduled reset task
│   │   ├── check-renewal-reminders/ # Trial reminder task
│   │   └── [others]/              # Additional endpoints
│   ├── migrations/                # Database schema migrations
│   │   ├── [timestamp]_[name].sql # Versioned schema changes
│   └── snippets/                  # Shared SQL snippets
│
├── e2e/                           # End-to-end tests (Playwright)
├── public/                        # Static assets
├── dist/                          # Production build output
├── docs/                          # Documentation files
│
├── .planning/                     # GSD planning documents
│   └── codebase/                  # This codebase analysis
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       ├── CONVENTIONS.md
│       ├── TESTING.md
│       ├── STACK.md
│       └── INTEGRATIONS.md
│
├── vite.config.ts                 # Vite build configuration
├── vitest.config.ts               # Vitest test configuration
├── tsconfig.json                  # TypeScript root config
├── tsconfig.app.json              # App TypeScript config
├── tsconfig.node.json             # Node TypeScript config
├── eslint.config.js               # ESLint configuration
├── package.json                   # Dependencies + scripts
└── tailwind.config.ts             # Tailwind CSS configuration
```

## Directory Purposes

**src/components/**
- Purpose: Reusable React components organized by feature domain
- Contains: 93 total components across 13 subdirectories + 77 root-level
- Organizational principle: Feature-first (canvas/, artie/, admin/) + utility-first (ui/), with root-level for widely-used components

**src/pages/**
- Purpose: Page-level components that map to routes
- Contains: 33 page files, each corresponds to a route in `App.tsx`
- Naming: PascalCase, named after route (e.g., `Dashboard.tsx` → `/dashboard`)

**src/store/**
- Purpose: Lightweight client-side state management using external store pattern
- Contains: 7 store/context files managing different domains (canvas, studio, modals)
- Pattern: Each store exports `useStore()` selector hook using `useSyncExternalStore`

**src/contexts/**
- Purpose: React Context providers for authentication and modal state
- Contains: `AuthContext.tsx` (user session, prefetching), `ToolsModalContext.tsx`
- Pattern: Context provider wraps app in `App.tsx`, child components use `useAuth()` or `useToolsModal()` hooks

**src/hooks/**
- Purpose: Reusable React hook logic for components and other hooks
- Contains: 40+ custom hooks organized by concern
- Naming: Verb-first in camelCase (e.g., `useCredits.tsx`, `useFeatureAccess.tsx`)
- Subdirectory: `canvas/` for canvas-specific hooks (9 files)

**src/lib/**
- Purpose: Business logic, service integrations, and utility functions
- Contains: 40+ modules organized by feature/concern
- Subdirectories: `artie/` (AI logic), `imageEditing/` (image manipulation), `intelligence/` (smart defaults), `utils/` (helpers), `stubs/` (placeholders)
- Key modules:
  - `edgeFunctionClient.ts` - Unified interface to call edge functions
  - `imageOptimization.ts` - Image processing before upload/analysis
  - `saveAsset.ts` - Persist generated assets to Supabase
  - `analytics.ts` - Mixpanel event tracking

**src/types/**
- Purpose: Shared TypeScript type definitions
- Contains: 2 files (`canvas.ts`, `userPreferences.ts`)
- Pattern: Centralized types shared across components/hooks/stores

**src/integrations/supabase/**
- Purpose: Supabase client initialization and type definitions
- Contains: `client.ts` (configured client), `types.ts` (auto-generated DB types)
- Generated: `types.ts` is auto-generated from Supabase schema (do not edit manually)

**supabase/functions/**
- Purpose: Serverless endpoints for image generation, AI processing, payments
- Contains: 30+ edge function implementations
- Pattern: Each function in own directory with `index.ts` entry point
- Shared: `_shared/` directory contains utilities used by all functions

**supabase/functions/_shared/**
- Purpose: Cross-function utilities and abstractions
- Contains: 12 shared modules (provider abstraction, prompt engine, error handling, etc.)
- Used by: All edge functions

**supabase/migrations/**
- Purpose: Database schema version control
- Contains: Versioned SQL migration files
- Naming: `[timestamp]_[description].sql` (auto-generated by Supabase CLI)

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Application entry point, React root initialization
- `src/App.tsx`: Root component, routing setup, provider wrappers
- `vite.config.ts`: Build configuration

**Core Features:**
- Studio/Generation: `src/pages/Index.tsx`, `src/components/ImageGenerationDialog.tsx`
- Canvas Editor: `src/pages/CanvasPage.tsx`, `src/components/canvas/*`
- AI Assistant (Artie): `src/pages/ArtiePage.tsx`, `src/components/ArtieChat.tsx`
- Authentication: `src/pages/Auth.tsx`, `src/contexts/AuthContext.tsx`
- Admin Panel: `src/pages/Admin.tsx`, `src/components/admin/*`

**State Management:**
- Canvas state: `src/store/canvasStore.ts`
- Studio parameters: `src/store/studioStore.ts`
- User auth: `src/contexts/AuthContext.tsx`

**Service Layer:**
- Edge function client: `src/lib/edgeFunctionClient.ts`
- Image optimization: `src/lib/imageOptimization.ts`
- Asset persistence: `src/lib/saveAsset.ts`
- Analytics: `src/lib/analytics.ts`

**Hooks (Core Business Logic):**
- AI core: `src/hooks/useArtieCore.ts`
- Credits: `src/hooks/useCredits.tsx`
- Feature access: `src/hooks/useFeatureAccess.tsx`
- User preferences: `src/hooks/useUserPreferences.tsx`
- Streaming: `src/hooks/useStreamingGeneration.ts`

**Backend:**
- Image generation: `supabase/functions/generate-image/index.ts`
- AI chat: `supabase/functions/artie-chat/index.ts`
- Analysis: `supabase/functions/analyze-image/index.ts`
- Shared utilities: `supabase/functions/_shared/*.ts`

## Naming Conventions

**Files:**
- Pages: PascalCase (e.g., `Dashboard.tsx`, `CanvasPage.tsx`)
- Components: PascalCase (e.g., `Header.tsx`, `GeneratedImagesGallery.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useCredits.tsx`, `useArtieCore.ts`)
- Utilities/Services: camelCase (e.g., `edgeFunctionClient.ts`, `imageOptimization.ts`)
- Edge functions: kebab-case directories (e.g., `generate-image/`, `artie-chat/`)

**Directories:**
- Feature-based: lowercase (e.g., `canvas/`, `artie/`, `admin/`)
- Utility: lowercase, semantic (e.g., `lib/`, `hooks/`, `store/`, `types/`)

**Variables/Functions:**
- camelCase for functions, variables, constants
- UPPER_SNAKE_CASE for constants (e.g., `SIZE_TO_ASPECT_RATIO` in `_shared/generationParams.ts`)
- PascalCase for React components and classes

## Where to Add New Code

**New Route/Page:**
1. Create page component in `src/pages/[PageName].tsx`
2. Add route in `src/App.tsx` Routes section
3. Import page as lazy route if not critical (use `lazy()` wrapper)
4. Create accompanying components in subdirectories as needed

**New Feature Component:**
- Primary code: `src/components/[FeatureName]/` if it's complex, or `src/components/[FeatureName].tsx` if simple
- Subcomponents: Create directory with multiple files if component gets large
- Example: Canvas editor is `src/components/canvas/` with 16 files

**New Custom Hook:**
- Location: `src/hooks/use[HookName].tsx` (or `.ts` if no JSX)
- If hook is canvas-specific: `src/hooks/canvas/use[HookName].tsx`
- Naming: Always start with `use` prefix

**New Business Logic/Utility:**
- General utility: `src/lib/[moduleName].ts`
- Feature-specific: `src/lib/[featureName]/[module].ts` (create subdirectory if needed)
- Pattern: Export functions/constants, keep as pure functions when possible

**New State Management:**
- If state is simple/global: Add to existing store in `src/store/`
- If state is new domain: Create new `src/store/[domain]Store.ts`
- Pattern: Use external store with `useSyncExternalStore` + listener subscriptions

**New Edge Function:**
1. Create directory: `supabase/functions/[function-name]/`
2. Create entry: `supabase/functions/[function-name]/index.ts`
3. Import shared utilities from `../_shared/`
4. Structure: CORS handling → validation → provider call → response
5. Register in Supabase config if needed

**New Database Schema:**
1. Create migration: `supabase/migrations/[timestamp]_[description].sql`
2. Update types: Run Supabase CLI to regenerate `src/integrations/supabase/types.ts`
3. Create RLS policies in migration for security

## Special Directories

**dist/**
- Purpose: Production build output
- Generated: Yes (via `npm run build`)
- Committed: No (in .gitignore)
- Contents: Bundled JS, CSS, optimized assets

**node_modules/**
- Purpose: npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No (in .gitignore)

**public/**
- Purpose: Static assets served as-is (logos, fonts, etc.)
- Generated: No
- Committed: Yes
- Access: Referenced in HTML as `/[filename]`

**e2e/**
- Purpose: End-to-end tests via Playwright
- Generated: No
- Committed: Yes
- Run: `npx playwright test`

**.planning/codebase/**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md

**supabase/.temp/ and supabase/.branches/**
- Purpose: Local Supabase CLI temporary files
- Generated: Yes
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-02-13*
