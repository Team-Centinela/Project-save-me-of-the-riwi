import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './src/test/msw/server';

// The env is validated at module-load time. The whole transitive
// import chain (http client → every API module) pulls the env on
// its first import, so we stub a valid token here once. Spec files
// that need to exercise the failure paths still call `vi.unstubAllEnvs()`
// inside their own `beforeEach` after `vi.resetModules()`.
vi.stubEnv('VITE_TMDB_READ_TOKEN', 'a'.repeat(64));

// `onUnhandledRequest: 'error'` is what makes MSW useful: a request that
// nobody simulated blows up the test instead of going to the real network.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(async () => {
  server.resetHandlers();
  // The library repository is a process-lifetime singleton. Reset
  // it so a previous test's corruption does not leak into the
  // next. The function is async (it walks the storage) but the
  // teardown is fire-and-forget.
  const { __resetLibraryRepositoryForTests } = await import('./src/infrastructure/storage');
  __resetLibraryRepositoryForTests();
  // And clear the localStorage slot to keep tests independent.
  if (typeof window !== 'undefined' && window.localStorage !== undefined) {
    window.localStorage.clear();
  }
  cleanup();
});
afterAll(() => {
  server.close();
});

// jsdom does not implement either of these, but the theme and the
// virtualizer expect them.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
