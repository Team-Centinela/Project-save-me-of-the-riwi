import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

const BASE = 'https://api.tmdb.test';
const TOKEN = 'a'.repeat(64);

const hit = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'The Lord of the Rings',
  overview: 'A meek Hobbit and eight companions set out on a journey.',
  poster_path: '/lotr.jpg',
  backdrop_path: null,
  release_date: '2001-12-18',
  vote_average: 8.4,
  vote_count: 20_000,
  genre_ids: [12, 14],
  ...overrides,
});

describe('infrastructure/api/search', () => {
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

  it('forwards the query as a query-string parameter and returns domain results', async () => {
    let requestedUrl: URL | null = null;
    server.use(
      http.get(`${BASE}/3/search/movie`, ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json({
          page: 1,
          results: [hit()],
          total_pages: 1,
          total_results: 1,
        });
      }),
    );

    const { searchMovies } = await import('./search');
    const result = await searchMovies({ query: 'lord of the rings' });

    const url = assertedUrl(requestedUrl);
    expect(url.searchParams.get('query')).toBe('lord of the rings');
    expect(result.results).toHaveLength(1);
    const first = result.results[0];
    expect(first?.title).toBe('The Lord of the Rings');
    expect(first?.backdropPath).toEqual({ kind: 'absent' });
  });

  it('passes page, include_adult, and primary_release_year when set', async () => {
    let requestedUrl: URL | null = null;
    server.use(
      http.get(`${BASE}/3/search/movie`, ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 });
      }),
    );

    const { searchMovies } = await import('./search');
    await searchMovies({
      query: 'matrix',
      page: 3,
      includeAdult: false,
      primaryReleaseYear: 1999,
    });

    const url = assertedUrl(requestedUrl);
    expect(url.searchParams.get('query')).toBe('matrix');
    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.get('include_adult')).toBe('false');
    expect(url.searchParams.get('primary_release_year')).toBe('1999');
  });

  it('returns an empty results list when nothing matches (not an error)', async () => {
    server.use(
      http.get(`${BASE}/3/search/movie`, () =>
        HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 }),
      ),
    );

    const { searchMovies } = await import('./search');
    const result = await searchMovies({ query: 'zzzznothingmatchesthisstringzzzz' });
    expect(result.results).toEqual([]);
    expect(result.totalResults).toBe(0);
  });

  it('throws when a result is missing a required field', async () => {
    server.use(
      http.get(`${BASE}/3/search/movie`, () =>
        HttpResponse.json({
          page: 1,
          results: [{ id: 1, title: 'No overview here' }],
          total_pages: 1,
          total_results: 1,
        }),
      ),
    );

    const { searchMovies } = await import('./search');
    await expect(searchMovies({ query: 'q' })).rejects.toThrow();
  });

  it('propagates HTTP errors as TmdbHttpError', async () => {
    server.use(
      http.get(`${BASE}/3/search/movie`, () =>
        HttpResponse.json({ status_code: 22, status_message: 'Invalid page.' }, { status: 400 }),
      ),
    );

    const { searchMovies } = await import('./search');
    await expect(searchMovies({ query: 'q' })).rejects.toMatchObject({
      detail: { kind: 'invalidPage' },
    });
  });
});

function assertedUrl(value: URL | null): URL {
  if (value === null) {
    throw new Error('expected the handler to have captured a request URL');
  }
  return value;
}
