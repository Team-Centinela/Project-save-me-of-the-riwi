/**
 * TMDB MSW handlers — covers the seven endpoints the app consumes.
 *
 * Every test consumes a different combination of filter values,
 * pagination, or response shape, so the per-endpoint spec files
 * declare their own handlers with the exact fixture they need. This
 * file is for tests that just want "any valid TMDB response" — for
 * example, a higher-level integration test that the filter UI
 * produces a query string and the matching list arrives at the
 * cache. Each handler returns a realistic snapshot of the response
 * the corresponding endpoint delivers in production.
 *
 * Conventions:
 *  - All handlers are `http.*` factories; pass them to
 *    `server.use(...handlers)` at the start of the test.
 *  - Handler order is irrelevant: `msw` matches by HTTP method and
 *    URL path with most-recent-wins semantics, so a test can add
 *    `server.use(http.get('/3/configuration', customHandler))` to
 *    swap the default for a specific shape.
 *  - The fixtures here are a baseline, not the source of truth.
 *    Each per-endpoint spec file owns its own fixtures.
 *
 * @see Cineteca.md — "El contrato con la API que consumen".
 */

import { http, HttpResponse } from 'msw';

// MSW glob paths (`*/3/...`) match any base URL, so the same
// handler works against the production TMDB base (`api.themoviedb.org`)
// and any test base the spec files stub (`api.tmdb.test` etc.). The
// `/3/` segment pins the API version so a future v4 stub does not
// accidentally collide.

// =============================================================================
// Fixtures
// =============================================================================
//
// These mirror the shape TMDB actually returns. Numbers are integers;
// strings are non-null unless TMDB uses `null` to mean "absent"; arrays
// are returned in the order TMDB chose (popularity.desc, in practice).

export const TMDB_MOVIE_SUMMARY_FIXTURE = {
  id: 27205,
  title: 'Inception',
  overview: 'A thief who steals corporate secrets.',
  poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
  backdrop_path: '/s3TBrRGB1iav7gFOCQi3fyWlYVv.jpg',
  release_date: '2010-07-16',
  vote_average: 8.4,
  vote_count: 30_000,
  genre_ids: [28, 12, 878],
};

// The detail endpoint returns full `genres` objects, not the
// numeric `genre_ids` array (that field is reserved for the
// summary endpoints — see PR #98). Destructuring keeps the
// detail fixture from inheriting a field `/movie/{id}` never
// sends; each fixture mirrors its own endpoint's shape.
const { genre_ids: _genreIds, ...summaryShape } = TMDB_MOVIE_SUMMARY_FIXTURE;

export const TMDB_MOVIE_DETAIL_FIXTURE = {
  ...summaryShape,
  tagline: 'Your mind is the scene of the crime.',
  runtime: 148,
  genres: [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 878, name: 'Science Fiction' },
  ],
  budget: 160_000_000,
  revenue: 836_800_000,
};

export const TMDB_MOVIE_DETAIL_WITH_APPENDAGES_FIXTURE = {
  ...TMDB_MOVIE_DETAIL_FIXTURE,
  credits: {
    cast: [
      {
        id: 6193,
        name: 'Leonardo DiCaprio',
        character: 'Dom Cobb',
        profile_path: '/13WoN0MpiLF8GTIRojnBYSqAaXh.jpg',
      },
      {
        id: 2405,
        name: 'Joseph Gordon-Levitt',
        character: 'Arthur',
        profile_path: '/4U9G4YwTlIEbAymBaseltS38eH4.jpg',
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

export const TMDB_CONFIGURATION_FIXTURE = {
  images: {
    base_url: 'http://image.tmdb.org/t/p',
    secure_base_url: 'https://image.tmdb.org/t/p',
    poster_sizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
    backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
    profile_sizes: ['w45', 'w185', 'h632', 'original'],
    still_sizes: ['w92', 'w185', 'w300', 'original'],
    logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
  },
  change_keys: ['adult', 'air_date', 'also_known_as', 'biography', 'budget', 'cast'],
};

export const TMDB_MOVIE_GENRES_FIXTURE = {
  genres: [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Science Fiction' },
    { id: 10770, name: 'TV Movie' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' },
  ],
};

const paginated = <T>(results: readonly T[], page = 1) => ({
  page,
  results,
  total_pages: 1,
  total_results: results.length,
});

// =============================================================================
// Handlers — one per endpoint the app calls.
// =============================================================================

export const tmdbHandlers = [
  http.get('*/3/configuration', () => HttpResponse.json(TMDB_CONFIGURATION_FIXTURE)),

  http.get('*/3/genre/movie/list', () => HttpResponse.json(TMDB_MOVIE_GENRES_FIXTURE)),

  http.get('*/3/discover/movie', () => HttpResponse.json(paginated([TMDB_MOVIE_SUMMARY_FIXTURE]))),

  http.get('*/3/search/movie', () => HttpResponse.json(paginated([TMDB_MOVIE_SUMMARY_FIXTURE]))),

  // Per-id detail: the handler does not branch on the append flag,
  // so a test that wants the appendage keys to be present should
  // override this handler with `server.use(...)`.
  http.get('*/3/movie/:id', () => HttpResponse.json(TMDB_MOVIE_DETAIL_FIXTURE)),

  http.get('*/3/movie/:id/recommendations', () =>
    HttpResponse.json(paginated([TMDB_MOVIE_SUMMARY_FIXTURE])),
  ),

  http.get('*/3/trending/movie/:timeWindow', () =>
    HttpResponse.json(paginated([TMDB_MOVIE_SUMMARY_FIXTURE])),
  ),
];
