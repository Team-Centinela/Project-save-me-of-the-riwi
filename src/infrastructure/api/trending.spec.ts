import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

const BASE = 'https://api.tmdb.test';
const TOKEN = 'a'.repeat(64);

const summary = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Dune: Part Two',
  overview: 'Paul Atreides unites with the Fremen.',
  poster_path: '/dune2.jpg',
  backdrop_path: null,
  release_date: '2024-03-01',
  vote_average: 8.5,
  vote_count: 4_000,
  genre_ids: [878, 12],
  ...overrides,
});

describe('infrastructure/api/trending', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TMDB_READ_TOKEN', TOKEN);
    vi.stubEnv('VITE_TMDB_API_BASE', BASE);
    server.resetHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('hits /trending/movie/week by default and returns the domain list', async () => {
    server.use(
      http.get(`${BASE}/3/trending/movie/week`, () =>
        HttpResponse.json({
          page: 1,
          results: [summary()],
          total_pages: 1,
          total_results: 1,
        }),
      ),
    );

    const { getTrendingMovies } = await import('./trending');
    const result = await getTrendingMovies({ timeWindow: 'week' });

    expect(result.results[0]?.title).toBe('Dune: Part Two');
    expect(result.totalResults).toBe(1);
  });

  it('routes to /trending/movie/day when the day window is requested', async () => {
    let requestedPath: string | null = null;
    server.use(
      http.get(`${BASE}/3/trending/movie/day`, ({ request }) => {
        requestedPath = new URL(request.url).pathname;
        return HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 });
      }),
    );

    const { getTrendingMovies } = await import('./trending');
    await getTrendingMovies({ timeWindow: 'day' });

    expect(requestedPath).toBe('/3/trending/movie/day');
  });

  it('forwards optional page and include_adult parameters', async () => {
    let requestedUrl: URL | null = null;
    server.use(
      http.get(`${BASE}/3/trending/movie/week`, ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json({ page: 2, results: [], total_pages: 10, total_results: 200 });
      }),
    );

    const { getTrendingMovies } = await import('./trending');
    await getTrendingMovies({ timeWindow: 'week', page: 2, includeAdult: false });

    const url = assertedUrl(requestedUrl);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('include_adult')).toBe('false');
  });

  it('returns an empty list when the response has no results', async () => {
    server.use(
      http.get(`${BASE}/3/trending/movie/week`, () =>
        HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 }),
      ),
    );

    const { getTrendingMovies } = await import('./trending');
    const result = await getTrendingMovies({ timeWindow: 'week' });
    expect(result.results).toEqual([]);
  });

  it('throws when a result is missing a required field', async () => {
    server.use(
      http.get(`${BASE}/3/trending/movie/week`, () =>
        HttpResponse.json({
          page: 1,
          results: [{ id: 1 }],
          total_pages: 1,
          total_results: 1,
        }),
      ),
    );

    const { getTrendingMovies } = await import('./trending');
    await expect(getTrendingMovies({ timeWindow: 'week' })).rejects.toThrow();
  });

  it('propagates HTTP errors as TmdbHttpError', async () => {
    server.use(
      http.get(`${BASE}/3/trending/movie/week`, () =>
        HttpResponse.json({ status_code: 7, status_message: 'Invalid API key.' }, { status: 401 }),
      ),
    );

    const { getTrendingMovies } = await import('./trending');
    await expect(getTrendingMovies({ timeWindow: 'week' })).rejects.toMatchObject({
      detail: { kind: 'invalidApiKey' },
    });
  });
});

function assertedUrl(value: URL | null): URL {
  if (value === null) {
    throw new Error('expected the handler to have captured a request URL');
  }
  return value;
}
