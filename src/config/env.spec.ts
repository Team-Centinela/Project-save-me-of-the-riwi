import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('config/env', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exports the validated env when VITE_TMDB_READ_TOKEN is set', async () => {
    vi.stubEnv('VITE_TMDB_READ_TOKEN', 'a'.repeat(64));
    const { env } = await import('./env');
    expect(env.VITE_TMDB_READ_TOKEN).toBe('a'.repeat(64));
    expect(env.VITE_TMDB_API_BASE).toBe('https://api.themoviedb.org');
    expect(env.VITE_TMDB_IMAGE_BASE).toBe('https://image.tmdb.org/t/p');
  });

  it('honors overrides for the API base URLs', async () => {
    vi.stubEnv('VITE_TMDB_READ_TOKEN', 'a'.repeat(64));
    vi.stubEnv('VITE_TMDB_API_BASE', 'https://api.example.com');
    vi.stubEnv('VITE_TMDB_IMAGE_BASE', 'https://image.example.com');
    const { env } = await import('./env');
    expect(env.VITE_TMDB_API_BASE).toBe('https://api.example.com');
    expect(env.VITE_TMDB_IMAGE_BASE).toBe('https://image.example.com');
  });

  it('throws when VITE_TMDB_READ_TOKEN is missing', async () => {
    // Stub explicitly with empty string: vi.unstubAllEnvs() (in
    // beforeEach above) only restores values that were stubbed by
    // vi.stubEnv, so a real CI secret in process.env would survive
    // unstub and make this test pass-through (resolves with the
    // secret instead of rejecting). Stubbing with '' is semantically
    // equivalent to "missing" here because Zod's z.string().min(40)
    // rejects the empty string with the same "Invalid environment
    // configuration" error the test asserts on.
    vi.stubEnv('VITE_TMDB_READ_TOKEN', '');
    await expect(import('./env')).rejects.toThrow(/Invalid environment configuration/);
  });

  it('throws when VITE_TMDB_READ_TOKEN is too short', async () => {
    vi.stubEnv('VITE_TMDB_READ_TOKEN', 'short');
    await expect(import('./env')).rejects.toThrow(/VITE_TMDB_READ_TOKEN/);
  });

  it('throws when VITE_TMDB_API_BASE is not a URL', async () => {
    vi.stubEnv('VITE_TMDB_READ_TOKEN', 'a'.repeat(64));
    vi.stubEnv('VITE_TMDB_API_BASE', 'not-a-url');
    await expect(import('./env')).rejects.toThrow(/VITE_TMDB_API_BASE/);
  });
});
