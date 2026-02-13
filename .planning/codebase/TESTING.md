# Testing Patterns

**Analysis Date:** 2026-02-13

## Test Framework

**Runner:**
- Vitest 4.0.12 (configured)
- Config location: `/Users/Justin/artdirectorstudio/vitest.config.ts`
- Test environment: jsdom (browser DOM simulation)
- Setup file: `./src/tests/setup.ts`

**Assertion Library:**
- Vitest built-in assertions (no separate library needed)
- Test-Library jest-dom matchers via `@testing-library/jest-dom`
- React Testing Library for component testing

**Run Commands:**
```bash
npm run lint              # Run ESLint only
vitest                   # Run all tests (interactive watch mode)
vitest run               # Run tests once (headless)
vitest --coverage        # Run with coverage report
```

## Test File Organization

**Location:**
- Co-located with source files: `*.test.ts` and `*.test.tsx` in same directory as implementation
- Tests in `src/tests/` for setup and utilities
- Example: `src/lib/sanitize.ts` has `src/lib/sanitize.test.ts` in same directory

**Naming:**
- Pattern: `{fileName}.test.ts` or `{fileName}.test.tsx`
- Files:
  - `src/lib/imageEditing/instructionGenerator.test.ts`
  - `src/lib/sanitize.test.ts`
  - `src/lib/notifications.test.ts`
  - `src/lib/requestDeduplication.test.ts`

**Structure:**
```
src/
├── lib/
│   ├── sanitize.ts
│   ├── sanitize.test.ts
│   ├── notifications.ts
│   ├── notifications.test.ts
│   ├── imageEditing/
│   │   ├── instructionGenerator.ts
│   │   └── instructionGenerator.test.ts
│   └── ...
└── tests/
    └── setup.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';

describe('moduleName', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = {...};

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

**Patterns:**
- Top-level `describe()` for module/file
- Nested `describe()` for each function/feature being tested
- Each `it()` test is single responsibility
- Descriptive test names starting with "should"
- Setup/teardown with `beforeEach()`, `afterEach()`, `beforeAll()`, `afterAll()`

**Example from codebase:**
```typescript
describe('instructionGenerator', () => {
  describe('generateInstructionFromAdjustments', () => {
    it('should return empty string for default adjustments', () => {
      const result = generateInstructionFromAdjustments(DEFAULT_ADJUSTMENTS);
      expect(result).toBe('');
    });

    it('should generate instruction for brightness increase', () => {
      const adjustments: Adjustments = {
        ...DEFAULT_ADJUSTMENTS,
        brightness: 120,
      };
      const result = generateInstructionFromAdjustments(adjustments);
      expect(result).toContain('brightness');
      expect(result).toContain('20%');
    });
  });
});
```

## Mocking

**Framework:** Vitest's `vi` object

**Patterns:**

Mock modules with `vi.mock()`:
```typescript
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}));
```

Mock functions with `vi.fn()`:
```typescript
const mockFn = vi.fn().mockResolvedValue('result');
const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));
```

Clear mocks between tests:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

**What to Mock:**
- External dependencies: Toast libraries (`sonner`), HTTP clients, external APIs
- Module-level side effects that affect other tests
- Time-dependent functions with `vi.useFakeTimers()`
- Global objects when needed: `window.matchMedia` (see setup.ts)

**What NOT to Mock:**
- Internal functions you're testing (test the real implementation)
- Domain logic utilities (test actual behavior)
- Type definitions and constants
- Built-in APIs like `Promise`, `JSON.parse()` (unless specifically testing error cases)

## Fixtures and Factories

**Test Data:**
- Inline object literals for simple test data
- Spread operator for data modification: `{...DEFAULT_ADJUSTMENTS, brightness: 120}`
- Named constants for repeated values: `DEFAULT_ADJUSTMENTS`, default values

**Location:**
- Simple fixtures: inline in test file
- Reusable fixtures: would go in `src/tests/` (not yet implemented in codebase)

**Pattern from codebase:**
```typescript
const adjustments: Adjustments = {
  ...DEFAULT_ADJUSTMENTS,
  brightness: 120,
  contrast: 80,
  saturation: 130,
};
const result = generateInstructionFromAdjustments(adjustments);
```

## Coverage

**Requirements:** No enforced coverage threshold in `vitest.config.ts`

**View Coverage:**
```bash
vitest --coverage
```

**Coverage Config:**
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'src/tests/',
    '**/*.d.ts',
    '**/*.config.*',
    '**/mockData.ts',
  ],
},
```

## Test Types

**Unit Tests:**
- Scope: Individual functions and utilities
- Approach: Test function inputs and outputs in isolation
- Examples: `sanitize.test.ts`, `instructionGenerator.test.ts`, `requestDeduplication.test.ts`
- Focus: Edge cases, parameter validation, error handling
- No mocking of internal logic, only external dependencies

**Integration Tests:**
- Scope: Function interactions with mocked dependencies
- Approach: Test how units work with mocked external services
- Example: `notifications.test.ts` mocks `sonner` library, tests notify object
- Setup: `vi.mock()` external dependencies, test real composition

**E2E Tests:**
- Framework: Playwright 1.56.1 (installed but not in use in codebase)
- Status: Not yet implemented
- Would test: Full user workflows, multi-step operations, component integration

## Common Patterns

**Async Testing:**
```typescript
it('should execute function again after TTL expires', async () => {
  const mockFn = vi.fn().mockResolvedValue('result');
  const ttl = 100;

  await deduplicate('test-key', mockFn, ttl);
  expect(mockFn).toHaveBeenCalledTimes(1);

  // Wait for TTL to expire
  await new Promise(resolve => setTimeout(resolve, ttl + 50));

  await deduplicate('test-key', mockFn, ttl);
  expect(mockFn).toHaveBeenCalledTimes(2);
});
```

**Error Testing:**
```typescript
it('should handle errors correctly', async () => {
  const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));

  await expect(deduplicate('test-key', mockFn)).rejects.toThrow('Test error');
});
```

**Mock Verification:**
```typescript
it('should call toast.success with title and description', () => {
  notify.success('Success!', 'Operation completed');
  expect(toast.success).toHaveBeenCalledWith('Success!', {
    description: 'Operation completed',
  });
});
```

**Data Mutation Testing:**
```typescript
it('should remove script tags', () => {
  const input = '<p>Hello</p><script>alert("XSS")</script>';
  const output = sanitizeHtml(input);
  expect(output).not.toContain('<script>');
  expect(output).not.toContain('alert');
  expect(output).toContain('Hello');
});
```

## Setup and Teardown

**Global Setup (`src/tests/setup.ts`):**
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia for Radix UI components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

**Per-Test Setup:**
- `beforeEach()`: Clear mocks, reset state
- `afterEach()`: Automatic cleanup via jest-dom, manual cleanup if needed

## Assertion Patterns

**Common assertions observed:**
- `expect(result).toBe(value)` - exact equality
- `expect(result).toContain(substring)` - string/array contains
- `expect(result).not.toContain(substring)` - negation
- `expect(result).toEqual(object)` - deep equality
- `expect(fn).toHaveBeenCalledWith(args)` - mock verification
- `expect(fn).toHaveBeenCalledTimes(n)` - call count
- `expect(promise).rejects.toThrow(message)` - async error testing

## When to Skip Testing

**Not found in codebase:**
- Component snapshot testing
- Visual regression testing
- Performance benchmarking
- Full E2E test suite (Playwright installed but not used)

---

*Testing analysis: 2026-02-13*
