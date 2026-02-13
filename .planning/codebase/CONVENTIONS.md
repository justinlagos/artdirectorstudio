# Coding Conventions

**Analysis Date:** 2026-02-13

## Naming Patterns

**Files:**
- PascalCase for component files: `ApplyAllButton.tsx`, `ImageContainer.tsx`, `KeyboardShortcutsGuide.tsx`
- camelCase for utility/function files: `sanitize.ts`, `notifications.ts`, `requestDeduplication.ts`
- camelCase for hook files with `use` prefix: `useSaveAsset.ts`, `useArtieCore.ts`, `useDebouncedCallback.tsx`
- Mixed case for context files (PascalCase with context suffix): `AuthContext.tsx`, `ToolsModalContext.tsx`

**Functions:**
- camelCase for regular functions: `generateInstructionFromAdjustments()`, `sanitizeHtml()`, `deduplicate()`
- PascalCase for React components: `ApplyAllButton`, `ImageContainer`, `ErrorBoundary`
- Prefix `use` for custom hooks: `useSaveAsset()`, `useAuth()`, `usePageViewTracking()`

**Variables:**
- camelCase for all variable declarations: `isLoading`, `pendingCount`, `activeRequests`, `queryClient`
- CONSTANT_CASE for module-level constants: `DEFAULT_ADJUSTMENTS`, `DEFAULT_TTL`, `ALLOWED_TAGS`
- Boolean prefixes (optional but seen): `isSignificant`, `isStandalone`, `isOnline`

**Types:**
- PascalCase for interface definitions: `AuthContextType`, `ImageContainerProps`, `Adjustments`, `SaveAssetOptions`
- PascalCase for exported type aliases: `ToolType = 'blend' | 'upscale' | 'batch' | 'generate'`
- Suffix `Props` for component prop interfaces: `ImageContainerProps`, `ApplyAllButtonProps`
- Suffix `Type` for context types: `AuthContextType`

## Code Style

**Formatting:**
- No Prettier config detected; team follows default conventions
- Consistent indentation: 2 spaces
- Multi-line prop drilling with aligned closing braces
- Ternary operators inline for simple conditions, multi-line for complex
- Template literals preferred over string concatenation

**Linting:**
- ESLint with TypeScript support via `typescript-eslint` package
- Config location: `/Users/Justin/artdirectorstudio/eslint.config.js`
- Key rules enforced:
  - React hooks rules enabled: `react-hooks/recommended`
  - React refresh: allows constant exports with `allowConstantExport: true`
  - Unused variables: warned but ignored if prefixed with `_` (e.g., `_unused`)
  - No `console.log` in production: only `console.error` and `console.warn` allowed (rule: `no-console`)
  - TypeScript `any` type triggers warning but not error

## Import Organization

**Order:**
1. Third-party React and framework imports: `react`, `react-dom`, `@tanstack/react-query`
2. Third-party UI/component libraries: `@radix-ui`, `lucide-react`, `sonner`, `framer-motion`
3. Custom context imports: `@/contexts/AuthContext`, `@/contexts/ToolsModalContext`
4. Custom hook imports: `@/hooks/useSaveAsset`, `@/hooks/useAuth`
5. Custom component imports: `@/components/ui/button`, `@/components/ErrorBoundary`
6. Custom utility/lib imports: `@/lib/analytics`, `@/lib/notifications`, `@/lib/sanitize`
7. Custom type imports: `type` keyword used for type-only imports: `import { type User, type Session } from "@supabase/supabase-js"`

**Path Aliases:**
- `@/` maps to `./src/` (configured in `tsconfig.json`)
- Example: `@/lib/notifications` → `src/lib/notifications.ts`
- Always use path aliases instead of relative imports

**Example import block:**
```typescript
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { analytics } from "@/lib/analytics";
```

## Error Handling

**Patterns:**
- Try-catch blocks wrap async operations and JSON parsing
- Error logging uses `console.error()` with context message: `console.error('Failed to sanitize JSON:', e)`
- Return `null` for failed operations when graceful degradation needed: `sanitizeJson()`, `supabase` calls
- Throw errors only for critical failures that should stop execution
- Error boundaries wrap component trees: `<ErrorBoundary>` used around lazy-loaded sections
- Toast notifications for user-facing errors: `toast.error()` from sonner library
- Conditional logging in development mode: `if (import.meta.env.DEV) { console.log() }`

**Examples from codebase:**
- JSON parsing: Try-catch with null return fallback
- Service worker registration: Try-catch with console.error logging
- API calls: Wrapped in `try-catch` with retry logic
- Component errors: ErrorFallback component displays user-friendly message in dev mode

## Logging

**Framework:** console API directly (no logging library)

**Patterns:**
- `console.error()` for errors and failures
- `console.warn()` for warnings and potential issues
- `console.log()` for informational messages (restricted by ESLint: only with allow list)
- Prefix logs with context: `[Dedup]`, `[EdgeFunction]`, `[Sentry]`, `✅`, `❌`, `⚠️`
- Only log in development mode for non-critical info: `if (import.meta.env.DEV) { console.log() }`

**Example patterns:**
```typescript
console.error('Failed to sanitize JSON:', e);
console.log(`[Dedup] Returning cached promise for: ${key}`);
console.log(`✅ All ${summary.healthyCount} functions healthy`);
console.warn(`⚠️ ${summary.unhealthyCount}/${summary.results.length} functions unhealthy`);
```

## Comments

**When to Comment:**
- JSDoc comments above exported functions and interfaces
- Inline comments for non-obvious logic
- Comments for complex calculations or decision points
- Comments explaining why, not what (code shows what)

**JSDoc/TSDoc:**
- Triple-slash format for function documentation
- Parameter descriptions with types
- Return type descriptions
- Example: `@param key - Unique identifier for the request`
- Located directly above function/export

**Example:**
```typescript
/**
 * Deduplicate requests with the same key
 * If a request with the same key is already in progress, return the existing promise
 *
 * @param key - Unique identifier for the request (e.g., "generate:prompt:options")
 * @param fn - Function that returns a promise
 * @param ttl - Time to live in milliseconds (default: 5000)
 * @returns Promise result
 */
export async function deduplicate<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
```

## Function Design

**Size:** Functions typically 20-80 lines, longer functions extract helpers or use composition

**Parameters:**
- Destructured object parameters for multiple arguments (seen in all components)
- Optional parameters with defaults: `maxHeight = "max-h-[400px]"`, `ttl: number = DEFAULT_TTL`
- Type annotations on all parameters (strict TypeScript usage)

**Return Values:**
- Explicit return type annotations on all functions
- Components return JSX or null
- Utilities return typed values: `Promise<T>`, `string`, `null`, `Record<string, number>`
- Async functions always return Promise

**Example function patterns:**
```typescript
export const ApplyAllButton = ({
  pendingCount,
  onApply,
  isLoading,
  className = ""
}: ApplyAllButtonProps) => {
  if (pendingCount === 0) return null;
  // ...
};

export async function deduplicate<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // ...
}
```

## Module Design

**Exports:**
- Named exports preferred: `export function`, `export const`, `export interface`
- Default exports used only for pages/routes
- Re-exports for barrel files: `export * from './notifications'`

**Barrel Files:**
- Not extensively used; direct imports preferred
- UI components use barrel index: `/components/ui/` contains shadcn components

**Patterns observed:**
- Single responsibility per file
- Utilities grouped by feature: `src/lib/imageEditing/`, `src/lib/intelligence/`
- Context providers paired with hooks: `AuthContext.tsx` + `useAuth()` hook
- Component organization: UI components in `/components`, feature-specific in subdirectories

---

*Convention analysis: 2026-02-13*
