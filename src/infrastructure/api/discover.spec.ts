import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

const BASE = 'https://api.tmdb.test';
const TOKEN = 'a'.repeat(64);

const sampleSummary = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Inception',
  overview: 'A thief who steals corporate secrets.',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  release_date: '2010-07-16',
  vote_average: 8.4,
  vote_count: 30_000,
  genre_ids: [28, 12],
  ...overrides,
});

describe('infrastructure/api/discover', () => {
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

  it('returns the empty paginated shape when no filter matches', async () => {
    server.use(
      http.get(`${BASE}/3/discover/movie`, () =>
        HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 }),
      ),
    );

    const { discoverMovies } = await import('./discover');
    const result = await discoverMovies();
    expect(result).toEqual({ page: 1, results: [], totalPages: 0, totalResults: 0 });
  });

  it('translates every raw result into a domain MovieSummary (no TMDB JSON leaks)', async () => {
    server.use(
      http.get(`${BASE}/3/discover/movie`, () =>
        HttpResponse.json({
          page: 1,
          results: [
            sampleSummary({ id: 1 }),
            sampleSummary({
              id: 2,
              title: 'The Matrix',
              release_date: '1999-03-31',
              poster_path: null,
              backdrop_path: null,
              vote_average: 8.7,
              vote_count: 25_000,
              genre_ids: [28, 878],
            }),
          ],
          total_pages: 1,
          total_results: 2,
        }),
      ),
    );

    const { discoverMovies } = await import('./discover');
    const result = await discoverMovies();
    expect(result.results).toHaveLength(2);
    const first = result.results[0];
    const second = result.results[1];
    expect(first?.title).toBe('Inception');
    expect(second?.title).toBe('The Matrix');
    expect(second?.posterPath).toEqual({ kind: 'absent' });
    expect(result.totalPages).toBe(1);
    expect(result.totalResults).toBe(2);
  });

  it('passes only the set filters as query parameters', async () => {
    let requestedUrl: URL | null = null;
    server.use(
      http.get(`${BASE}/3/discover/movie`, ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 });
      }),
    );

    const { discoverMovies } = await import('./discover');
    await discoverMovies({
      genreIds: [28, 12],
      primaryReleaseYear: 2024,
      minVoteAverage: 7,
      minVoteCount: 200,
      sortBy: 'vote_average.desc',
      page: 2,
      includeAdult: false,
    });

    const url = assertedUrl(requestedUrl);
    expect(url.searchParams.get('with_genres')).toBe('28,12');
    expect(url.searchParams.get('primary_release_year')).toBe('2024');
    expect(url.searchParams.get('vote_average.gte')).toBe('7');
    expect(url.searchParams.get('vote_count.gte')).toBe('200');
    expect(url.searchParams.get('sort_by')).toBe('vote_average.desc');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('include_adult')).toBe('false');
  });

  it('omits query parameters that were not set', async () => {
    let requestedUrl: URL | null = null;
    server.use(
      http.get(`${BASE}/3/discover/movie`, ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 });
      }),
    );

    const { discoverMovies } = await import('./discover');
    await discoverMovies();

    const url = assertedUrl(requestedUrl);
    expect([...url.searchParams.keys()]).toEqual([]);
  });

  it('classifies the released/unreleased boundary via the shared mapper', async () => {
    // The boundary logic lives in `toMovieSummary`; pin "now" so
    // the assertion is deterministic at any wall-clock time.
    const futureRaw = sampleSummary({ id: 1, release_date: '2099-12-31' });
    const pastRaw = sampleSummary({ id: 2, release_date: '1999-03-31' });
    const pinnedNow = new Date('2024-01-01T00:00:00Z');

    const { toMovieSummary } = await import('./_shared');
    expect(toMovieSummary(futureRaw, pinnedNow).state.kind).toBe('unreleased');
    expect(toMovieSummary(pastRaw, pinnedNow).state.kind).toBe('released');
  });

  it('throws when a result misses a required field', async () => {
    server.use(
      http.get(`${BASE}/3/discover/movie`, () =>
        HttpResponse.json({
          page: 1,
          results: [{ id: 1, title: 'Broken' }],
          total_pages: 1,
          total_results: 1,
        }),
      ),
    );

    const { discoverMovies } = await import('./discover');
    await expect(discoverMovies()).rejects.toThrow();
  });

  it('propagates HTTP errors as TmdbHttpError (e.g. invalid page)', async () => {
    server.use(
      http.get(`${BASE}/3/discover/movie`, () =>
        HttpResponse.json({ status_code: 22, status_message: 'Invalid page.' }, { status: 400 }),
      ),
    );

    const { discoverMovies } = await import('./discover');
    await expect(discoverMovies()).rejects.toMatchObject({
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
