/**
 * Sanity test for the shared TMDB MSW handlers.
 *
 * The per-endpoint spec files register their own handlers, so the
 * shared ones are exercised by this minimal test only — that is
 * the whole point of having the shared file. A future integration
 * test in `src/presentation/**` can `server.use(...tmdbHandlers)`
 * to get real-looking data without writing fixtures from scratch.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from './server';
import { tmdbHandlers } from './tmdb-handlers';

describe('test/msw/tmdb-handlers', () => {
  beforeEach(() => {
    server.use(...tmdbHandlers);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('responds to /3/configuration with the configuration fixture', async () => {
    const res = await fetch('https://example.test/3/configuration');
    const body: unknown = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      images: { secure_base_url: 'https://image.tmdb.org/t/p' },
    });
  });

  it('responds to /3/genre/movie/list with the genre catalogue', async () => {
    const res = await fetch('https://example.test/3/genre/movie/list');
    const body = (await res.json()) as { genres: readonly { id: number; name: string }[] };
    expect(body.genres.map((g) => g.id)).toContain(28);
    expect(body.genres.map((g) => g.id)).toContain(878);
  });

  it('responds to /3/discover/movie with a paginated list', async () => {
    const res = await fetch('https://example.test/3/discover/movie');
    const body = (await res.json()) as { results: readonly unknown[]; total_pages: number };
    expect(body.results).toHaveLength(1);
    expect(body.total_pages).toBe(1);
  });

  it('responds to /3/search/movie with a paginated list', async () => {
    const res = await fetch('https://example.test/3/search/movie?query=inception');
    const body = (await res.json()) as { results: readonly unknown[] };
    expect(body.results).toHaveLength(1);
  });

  it('responds to /3/movie/{id} with the detail fixture (no appendages)', async () => {
    const res = await fetch('https://example.test/3/movie/27205');
    const body = (await res.json()) as { id: number; tagline: string; runtime: number };
    expect(body.id).toBe(27205);
    expect(body.tagline).toBe('Your mind is the scene of the crime.');
    expect(body.runtime).toBe(148);
    // The default handler must NOT include appendage keys — the
    // appendage fixture is opt-in via a per-test override.
    expect('credits' in body).toBe(false);
  });

  it('responds to /3/movie/{id}/recommendations with a paginated list', async () => {
    const res = await fetch('https://example.test/3/movie/27205/recommendations');
    const body = (await res.json()) as { results: readonly unknown[] };
    expect(body.results).toHaveLength(1);
  });

  it('responds to /3/trending/movie/{time_window} with a paginated list', async () => {
    const res = await fetch('https://example.test/3/trending/movie/week');
    const body = (await res.json()) as { results: readonly unknown[] };
    expect(body.results).toHaveLength(1);
  });
});
