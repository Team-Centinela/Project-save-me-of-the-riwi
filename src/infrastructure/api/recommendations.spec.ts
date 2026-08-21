import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

const BASE = 'https://api.tmdb.test';
const TOKEN = 'a'.repeat(64);

const summary = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'The Dark Knight',
  overview: 'Batman raises the stakes.',
  poster_path: '/tdk.jpg',
  backdrop_path: null,
  release_date: '2008-07-16',
  vote_average: 9.0,
  vote_count: 30_000,
  genre_ids: [28, 80],
  ...overrides,
});

describe('infrastructure/api/recommendations', () => {
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

  it('hits /movie/{id}/recommendations and returns the mapped list', async () => {
    server.use(
      http.get(`${BASE}/3/movie/27205/recommendations`, () =>
        HttpResponse.json({
          page: 1,
          results: [summary({ id: 155 }), summary({ id: 49026 })],
          total_pages: 1,
          total_results: 2,
        }),
      ),
    );

    const { getMovieRecommendations } = await import('./recommendations');
    const result = await getMovieRecommendations({ id: 27205 });

    expect(result.results.map((m) => m.id)).toEqual([155, 49026]);
    expect(result.totalResults).toBe(2);
  });

  it('forwards the page query parameter when set', async () => {
    let requestedUrl: URL | null = null;
    server.use(
      http.get(`${BASE}/3/movie/27205/recommendations`, ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json({ page: 2, results: [], total_pages: 5, total_results: 100 });
      }),
    );

    const { getMovieRecommendations } = await import('./recommendations');
    await getMovieRecommendations({ id: 27205, page: 2 });

    const url = assertedUrl(requestedUrl);
    expect(url.searchParams.get('page')).toBe('2');
  });

  it('does not include a page query parameter when omitted', async () => {
    let requestedUrl: URL | null = null;
    server.use(
      http.get(`${BASE}/3/movie/27205/recommendations`, ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 });
      }),
    );

    const { getMovieRecommendations } = await import('./recommendations');
    await getMovieRecommendations({ id: 27205 });

    const url = assertedUrl(requestedUrl);
    expect(url.searchParams.has('page')).toBe(false);
  });

  it('returns an empty results list when the movie has no recommendations', async () => {
    server.use(
      http.get(`${BASE}/3/movie/27205/recommendations`, () =>
        HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 }),
      ),
    );

    const { getMovieRecommendations } = await import('./recommendations');
    const result = await getMovieRecommendations({ id: 27205 });
    expect(result.results).toEqual([]);
  });

  it('throws when a result is missing a required field', async () => {
    server.use(
      http.get(`${BASE}/3/movie/27205/recommendations`, () =>
        HttpResponse.json({
          page: 1,
          results: [{ id: 1 }],
          total_pages: 1,
          total_results: 1,
        }),
      ),
    );

    const { getMovieRecommendations } = await import('./recommendations');
    await expect(getMovieRecommendations({ id: 27205 })).rejects.toThrow();
  });

  it('propagates a notFound when the source movie id does not exist', async () => {
    server.use(
      http.get(`${BASE}/3/movie/999/recommendations`, () =>
        HttpResponse.json({ status_code: 34, status_message: 'Not found.' }, { status: 404 }),
      ),
    );

    const { getMovieRecommendations } = await import('./recommendations');
    await expect(getMovieRecommendations({ id: 999 })).rejects.toMatchObject({
      detail: { kind: 'notFound' },
    });
  });
});

function assertedUrl(value: URL | null): URL {
  if (value === null) {
    throw new Error('expected the handler to have captured a request URL');
  }
  return value;
}
