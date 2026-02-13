# Technology Stack

**Analysis Date:** 2026-02-13

## Languages

**Primary:**
- TypeScript 5.8.3 - Application code, type safety across frontend
- JavaScript (JSX/TSX) - React component definitions

**Secondary:**
- HTML5 - Document structure (service worker, offline page)
- CSS - Styling via Tailwind and PostCSS

## Runtime

**Environment:**
- Node.js 22.22.0 (development)
- Browser (ES2020+, with fallback to ES2023 library support)

**Package Manager:**
- npm (version 10.x based on package-lock.json v3)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 18.3.1 - UI library and component framework
- React DOM 18.3.1 - React rendering for web
- React Router 6.30.1 - Client-side routing (`pages/` directory contains route components)

**UI Component Library:**
- Radix UI (@radix-ui/*) - Complete set of headless UI components (accordion, dialog, dropdown, tabs, etc.)
- Shadcn/UI - High-level components built on Radix UI primitives (custom component library in `src/components/ui/`)

**State Management:**
- React Context API - Auth context in `src/contexts/AuthContext.tsx`, Tools modal context
- Zustand pattern - Studio store in `src/store/studioStore.ts` (observable store pattern)
- TanStack React Query 5.83.0 - Server state management, caching, and synchronization

**Form Handling:**
- React Hook Form 7.61.1 - Form state and validation
- Zod 3.25.76 - Schema validation and type inference

**Data & API:**
- Supabase JS SDK 2.77.0 - PostgreSQL backend, auth, and edge functions
- Supabase client auto-generated types in `src/integrations/supabase/types.ts`

**UI Enhancements:**
- Framer Motion 12.23.24 - Animations and transitions
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- Tailwind CSS Animate 1.0.7 - Pre-built animation utilities
- Class Variance Authority 0.7.1 - CSS class composition for component variants
- Tailwind Merge 2.6.0 - Merging conflicting Tailwind classes

**Charts & Data Visualization:**
- Recharts 2.15.4 - React charts for analytics (used in `src/components/UserAnalytics.tsx`)

**Theming:**
- next-themes 0.3.0 - Dark/light mode switching

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Modern drag-and-drop system
- @dnd-kit/sortable 8.0.0 - Sortable list functionality
- @dnd-kit/utilities 3.2.2 - Helper utilities

**Document Processing:**
- Mammoth 1.11.0 - Word document (.docx) conversion
- jsPDF 4.1.0 - PDF generation and manipulation
- pdfjs-dist 5.4.394 - PDF rendering and viewing
- DOMPurify 3.3.0 - HTML sanitization

**Image Processing:**
- browser-image-compression 2.0.2 - Client-side image compression
- Embla Carousel 8.6.0 - Carousel/slider component

**UI Components:**
- Lucide React 0.555.0 - Icon library
- React Icons 4.12.0 - Alternative icon set
- Sonner 1.7.4 - Toast notifications
- React Helmet Async 2.0.5 - Head management

**Testing:**
- Vitest 4.0.12 - Unit/integration test runner
- @testing-library/react 16.3.0 - React testing utilities
- @testing-library/jest-dom 6.9.1 - Jest matchers for DOM
- @vitest/ui 4.0.12 - Test UI dashboard
- @playwright/test 1.56.1 - E2E testing framework
- jsdom 28.0.0 - DOM implementation for testing

**Build & Dev:**
- Vite 7.3.1 - Build tool and dev server
- @vitejs/plugin-react-swc 3.11.0 - React plugin using SWC compiler
- TypeScript ESLint (@typescript-eslint/*) 8.38.0 - TypeScript linting
- ESLint 9.32.0 - JavaScript linting
- eslint-plugin-react-hooks 5.2.0 - React hooks linting
- eslint-plugin-react-refresh 0.4.20 - React Fast Refresh validation
- Autoprefixer 10.4.21 - CSS vendor prefixing
- PostCSS 8.5.6 - CSS transformation

**Utilities:**
- Web Vitals 5.1.0 - Performance monitoring
- Date-fns 3.6.0 - Date manipulation and formatting
- Input OTP 1.4.2 - OTP input component
- Cmdk 1.1.1 - Command menu component
- React Day Picker 8.10.1 - Date picker component
- React Resizable Panels 2.1.9 - Resizable panel layouts
- Vaul 0.9.9 - Drawer component

**Service Worker & Offline:**
- Workbox Build 7.3.0 - Service worker generation
- Workbox Window 7.3.0 - Service worker communication from browser

**Analytics & Error Tracking:**
- Mixpanel Browser 2.72.0 - User event tracking
- Sentry React 10.25.0 - Error tracking and performance monitoring

**Misc Dev Tools:**
- lovable-tagger 1.1.11 - Tag generation tool
- @originjs/vite-plugin-commonjs 1.0.3 - CommonJS compatibility in Vite
- @tailwindcss/typography 0.5.16 - Typography plugin for Tailwind
- @types/node 22.16.5 - Node.js type definitions
- @types/react 18.3.23 - React type definitions
- @types/react-dom 18.3.7 - React DOM type definitions
- @types/dompurify 3.2.0 - DOMPurify type definitions
- globals 15.15.0 - Global variable types for ESLint

## Configuration

**Environment:**
- Managed via `.env` file (Supabase URL, keys)
- Required vars: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY` (legacy), `VITE_SENTRY_DSN` (optional), `VITE_MIXPANEL_TOKEN` (optional), `VITE_CLOUDFLARE_ACCOUNT_ID` (for future CDN integration)
- Build-time vs runtime: Vite-based env vars with `VITE_` prefix are embedded at build time

**Build:**
- `vite.config.ts` - Vite configuration with React SWC plugin and `@/*` path alias
- `tsconfig.json` - Root TS config with references to app and node configs
- `tsconfig.app.json` - App compilation (src/)
- `tsconfig.node.json` - Node/build tool compilation

**Styling:**
- `tailwind.config.ts` - Tailwind configuration with custom spacing, colors, shadows, animations, and z-index scale
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer

**Linting:**
- `eslint.config.js` - ESLint config using @typescript-eslint, with React hooks and refresh rules

**Code Generation:**
- `src/integrations/supabase/types.ts` - Auto-generated Supabase types (PostgreSQL schema)
- `src/integrations/supabase/client.ts` - Auto-generated Supabase client with environment validation

## Platform Requirements

**Development:**
- Node.js 22.x or higher
- npm 10.x or higher
- Modern browser with ES2020+ support for dev server

**Production:**
- Browser support: ES2020+ (React 18 requirement)
- Service Worker support required for offline functionality
- IndexedDB/localStorage for auth token persistence

---

*Stack analysis: 2026-02-13*
