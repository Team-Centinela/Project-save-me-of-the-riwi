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
  // Node 25+ ships a built-in `localStorage` global as part of the
  // Web Storage API. With v25.0.0 the global is unflagged (v22 only
  // exposes it behind `--experimental-webstorage`; v26 will throw a
  // DOMException instead of returning an empty object). When
  // `--localstorage-file` is not provided to a valid path on v25,
  // the global is an empty stub object with no methods
  // (`setItem`/`getItem`/`clear`/etc. are all `undefined`). Vitest's
  // `populateGlobal` walks the jsdom window and only assigns keys that
  // are NOT already on `global` (or are in its allow-list); since
  // `localStorage` is neither, vitest skips it and Node's stub wins.
  // Every spec that touches `window.localStorage` then explodes with
  // "localStorage.clear is not a function". Replacing the stub with
  // jsdom's real Storage at file setup restores the expected behaviour
  // and is a no-op on Node versions where `localStorage` is undefined.
  const jsdomInstance = (globalThis as { jsdom?: { window: { localStorage: Storage } } }).jsdom;
  if (jsdomInstance) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: jsdomInstance.window.localStorage,
      writable: true,
      configurable: true,
    });
  }
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(async () => {
  server.resetHandlers();
  // The library repository is a process-lifetime singleton. Reset
  // it so a previous test's corruption does not leak into the
  // next. The function is async (it walks the storage) but the
  // teardown is fire-and-forget.
  const { __resetLibraryRepositoryForTests, __resetListsRepositoryForTests } =
    await import('./src/infrastructure/storage');
  __resetLibraryRepositoryForTests();
  __resetListsRepositoryForTests();
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
