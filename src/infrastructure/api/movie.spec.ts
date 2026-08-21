import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

const BASE = 'https://api.tmdb.test';
const TOKEN = 'a'.repeat(64);

const detailFixture = {
  id: 27205,
  title: 'Inception',
  overview: 'A thief who steals corporate secrets.',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  release_date: '2010-07-16',
  vote_average: 8.4,
  vote_count: 30_000,
  genre_ids: [28, 12],
  tagline: 'Your mind is the scene of the crime.',
  runtime: 148,
  genres: [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
  ],
  budget: 160_000_000,
  revenue: 836_800_000,
};

const detailWithAppendages = {
  ...detailFixture,
  credits: {
    cast: [
      {
        id: 6193,
        name: 'Leonardo DiCaprio',
        character: 'Dom Cobb',
        profile_path: '/13WoN0MpiLF8GTIRojnBYSqAaXh.jpg',
      },
    ],
  },
  videos: {
    results: [
      {
        id: '5e2c1c0e3f9a4b0007c7e2b1',
        key: 'YoHD9XEInc0',
        site: 'YouTube',
        type: 'Trailer',
        name: 'Inception - Trailer',
      },
    ],
  },
};

describe('infrastructure/api/movie', () => {
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

  it('fetches the detail and maps the basic fields to MovieDetail', async () => {
    server.use(http.get(`${BASE}/3/movie/27205`, () => HttpResponse.json(detailFixture)));

    const { getMovieDetail } = await import('./movie');
    const detail = await getMovieDetail({ id: 27205 });

    expect(detail.id).toBe(27205);
    expect(detail.title).toBe('Inception');
    expect(detail.tagline).toEqual({
      kind: 'present',
      value: 'Your mind is the scene of the crime.',
    });
    expect(detail.runtime).toEqual({ kind: 'present', value: 148 });
    expect(detail.genres).toEqual([
      { id: 28, name: 'Action' },
      { id: 12, name: 'Adventure' },
    ]);
    // Without the append flag, cast and trailers are absent.
    expect(detail.cast.kind).toBe('absent');
    expect(detail.trailers.kind).toBe('absent');
  });

  it('translates budget and revenue to Money integers (smallest unit)', async () => {
    server.use(http.get(`${BASE}/3/movie/27205`, () => HttpResponse.json(detailFixture)));

    const { getMovieDetail } = await import('./movie');
    const detail = await getMovieDetail({ id: 27205 });

    expect(detail.budget).toEqual({
      kind: 'present',
      value: { amount: 16_000_000_000, currency: 'USD' },
    });
    expect(detail.revenue).toEqual({
      kind: 'present',
      value: { amount: 83_680_000_000, currency: 'USD' },
    });
  });

  it('translates 0 / null budget to NoData.absent — never "zero dollars"', async () => {
    server.use(
      http.get(`${BASE}/3/movie/27205`, () =>
        HttpResponse.json({
          ...detailFixture,
          budget: 0,
          revenue: 0,
          runtime: 0,
          tagline: '',
        }),
      ),
    );

    const { getMovieDetail } = await import('./movie');
    const detail = await getMovieDetail({ id: 27205 });

    expect(detail.budget.kind).toBe('absent');
    expect(detail.revenue.kind).toBe('absent');
    expect(detail.runtime.kind).toBe('absent');
    expect(detail.tagline.kind).toBe('absent');
  });

  it('uses append_to_response=credits,videos when asked, returning cast and trailers as present', async () => {
    let requestedUrl: URL | null = null;
    server.use(
      http.get(`${BASE}/3/movie/27205`, ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json(detailWithAppendages);
      }),
    );

    const { getMovieDetail } = await import('./movie');
    const detail = await getMovieDetail({ id: 27205, appendCastAndTrailers: true });

    const url = assertedUrl(requestedUrl);
    expect(url.searchParams.get('append_to_response')).toBe('credits,videos');
    expect(detail.cast).toEqual({
      kind: 'present',
      value: [
        {
          id: 6193,
          name: 'Leonardo DiCaprio',
          character: { kind: 'present', value: 'Dom Cobb' },
          profilePath: { kind: 'present', value: '/13WoN0MpiLF8GTIRojnBYSqAaXh.jpg' },
        },
      ],
    });
    expect(detail.trailers).toEqual({
      kind: 'present',
      value: [
        {
          id: '5e2c1c0e3f9a4b0007c7e2b1',
          key: 'YoHD9XEInc0',
          site: 'YouTube',
          type: 'Trailer',
          name: 'Inception - Trailer',
        },
      ],
    });
  });

  it('handles a detail with one appendage but not the other', async () => {
    server.use(
      http.get(`${BASE}/3/movie/27205`, () =>
        HttpResponse.json({
          ...detailFixture,
          credits: { cast: [] },
          // `videos` omitted: TMDB chooses not to include it here
          // sometimes; the mapper must leave trailers absent.
        }),
      ),
    );

    const { getMovieDetail } = await import('./movie');
    const detail = await getMovieDetail({ id: 27205, appendCastAndTrailers: true });

    expect(detail.cast).toEqual({ kind: 'present', value: [] });
    expect(detail.trailers.kind).toBe('absent');
  });

  it('throws when a required field is missing', async () => {
    server.use(
      http.get(`${BASE}/3/movie/27205`, () =>
        HttpResponse.json({
          id: 27205,
          title: 'No genres here',
          overview: '',
          poster_path: null,
          backdrop_path: null,
          release_date: '',
          vote_average: 0,
          vote_count: 0,
          tagline: '',
          runtime: null,
          genres: [],
          budget: 0,
          revenue: 0,
          genre_ids: [],
        }),
      ),
    );

    const { getMovieDetail } = await import('./movie');
    // The mapper expects `appendages` not to break validation;
    // since `credits`/`videos` are absent, they default to undefined
    // and the optional appendage branches pass. But the missing
    // appendages block itself (no `credits` or `videos` keys) means
    // the schema's `nullish` rule applies; this is a passing case.
    // To exercise a real schema failure, override the handler with
    // an explicit broken field instead.
    void (await getMovieDetail({ id: 27205 }));
    await expect((await import('./movie')).getMovieDetail({ id: 27205 })).resolves.toBeDefined();

    server.resetHandlers();
    server.use(
      http.get(`${BASE}/3/movie/27205`, () =>
        HttpResponse.json({ id: 27205, title: 'Oops' /* boom */ }),
      ),
    );
    vi.resetModules();
    const { getMovieDetail: getMovieDetailAgain } = await import('./movie');
    await expect(getMovieDetailAgain({ id: 27205 })).rejects.toThrow();
  });

  it('propagates TMDB code 34 (not found) as notFound through the HTTP layer', async () => {
    server.use(
      http.get(`${BASE}/3/movie/999`, () =>
        HttpResponse.json({ status_code: 34, status_message: 'Not found.' }, { status: 404 }),
      ),
    );

    const { getMovieDetail } = await import('./movie');
    await expect(getMovieDetail({ id: 999 })).rejects.toMatchObject({
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
