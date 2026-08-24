/**
 * Internal helpers shared by every API module.
 *
 * Convention:
 *   - `tmdb*Schema` — raw Zod schema for a TMDB JSON shape.
 *   - `to*`        — raw → domain mapper (pure, total, deterministic).
 *
 * Underscore prefix is a code-reading convention: API modules
 * import from here, the rest of the app does not. The architecture
 * table forbids outside-layer imports of `infrastructure/*` directly.
 */

import { z } from 'zod';
import { iso4217 } from '@/domain/money/iso-4217';
import { moneyFromMajor } from '@/domain/money/money';
import { type NoData, absent, present } from '@/domain/shared/no-data';
import { type CastMember } from '@/domain/movie/cast';
import { type Genre } from '@/domain/movie/genre';
import { type MovieDetail } from '@/domain/movie/movie-detail';
import { type MovieSummary, classifyRelease, ratingFromVotes } from '@/domain/movie/movie-summary';
import { type RatingReliability } from '@/domain/rating/rating-reliability';
import { type Trailer } from '@/domain/movie/trailer';

// =============================================================================
// Boundary errors + shared parsing
// =============================================================================
//
// A broken field in a TMDB response must surface as a typed,
// readable boundary error — never as a raw `ZodError` dump. This
// mirrors the HTTP edge: network failures become `TmdbHttpError`
// (see `infrastructure/http/errors.ts`), shape failures become
// `TmdbSchemaError`.

/**
 * Thrown when a TMDB response does not match its documented shape.
 * Carries the endpoint that lied plus a short list of human-readable
 * issues so logs point at the actual drift instead of a parser dump.
 */
export class TmdbSchemaError extends Error {
  override name = 'TmdbSchemaError' as const;
  /** The endpoint whose response failed validation, e.g. `/3/discover/movie`. */
  readonly endpoint: string;
  /** Human-readable rendering of every failing path. */
  readonly issues: readonly string[];

  constructor(endpoint: string, cause: z.ZodError) {
    const issues = cause.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
      return `${path}: ${issue.message}`;
    });
    super(
      `TMDB response from ${endpoint} failed validation (${String(issues.length)} issue(s)): ${issues[0] ?? 'unknown'}`,
    );
    this.endpoint = endpoint;
    this.issues = issues;
    this.cause = cause;
  }
}

/**
 * Parse untrusted data against a Zod schema at the API boundary.
 * On failure, throws `TmdbSchemaError` (never a raw `ZodError`) so
 * callers pattern-match one boundary error family, like they do
 * for `TmdbHttpError`.
 */
export function parseWith<T>(schema: z.ZodType<T>, data: unknown, endpoint: string): T {
  try {
    return schema.parse(data);
  } catch (cause: unknown) {
    if (cause instanceof z.ZodError) {
      throw new TmdbSchemaError(endpoint, cause);
    }
    throw cause;
  }
}

// =============================================================================
// Pagination guard
// =============================================================================

/**
 * TMDB documents a hard cap of 500 pages on every paginated
 * endpoint; asking beyond it returns TMDB body code 22. The API
 * layer clamps instead of trusting the caller so the guarantee
 * holds even if a presentation-layer guard is added later —
 * the same belt-and-braces reasoning as the URL parser.
 */
export const TMDB_MAX_PAGE = 500;

/**
 * Clamp a requested page into `[1, TMDB_MAX_PAGE]`.
 *
 *   - `undefined` / non-finite → `undefined` (param not sent).
 *   - `< 1`                    → `1`.
 *   - `> 500`                  → `500`.
 *   - fractional values        → truncated toward zero first.
 */
export function clampPage(page: number | undefined): number | undefined {
  if (page === undefined || !Number.isFinite(page)) return undefined;
  return Math.min(Math.max(Math.trunc(page), 1), TMDB_MAX_PAGE);
}

// =============================================================================
// Raw TMDB Zod schemas
// =============================================================================
//
// All TMDB fields are typed as `unknown` until the schema narrows
// them. Nullable strings come back as `null`, empty strings, or
// absent; money fields as numbers (`0` means "no data"); dates as
// strings (`''` means unknown). Each mapper normalizes these to
// the domain's `NoData`, `Money`, or `MovieState` types.

export const tmdbMovieSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string(),
  poster_path: z.union([z.string(), z.null()]),
  backdrop_path: z.union([z.string(), z.null()]),
  release_date: z.union([z.string(), z.null()]),
  vote_average: z.number(),
  vote_count: z.number(),
  genre_ids: z.array(z.number()),
});

const tmdbGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const tmdbCastMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.union([z.string(), z.null()]),
  profile_path: z.union([z.string(), z.null()]),
});

const tmdbTrailerSchema = z.object({
  id: z.string(),
  key: z.string(),
  site: z.string(),
  type: z.string(),
  name: z.string(),
});

const tmdbDetailAppendagesSchema = z.object({
  credits: z
    .object({ cast: z.array(tmdbCastMemberSchema) })
    .nullable()
    .optional(),
  videos: z
    .object({ results: z.array(tmdbTrailerSchema) })
    .nullable()
    .optional(),
});

export const tmdbMovieDetailFullSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string(),
  poster_path: z.union([z.string(), z.null()]),
  backdrop_path: z.union([z.string(), z.null()]),
  release_date: z.union([z.string(), z.null()]),
  vote_average: z.number(),
  vote_count: z.number(),
  genre_ids: z.array(z.number()),
  tagline: z.union([z.string(), z.null()]),
  runtime: z.union([z.number().nonnegative(), z.null()]),
  genres: z.array(tmdbGenreSchema),
  budget: z.union([z.number().nonnegative(), z.null()]),
  revenue: z.union([z.number().nonnegative(), z.null()]),
  credits: tmdbDetailAppendagesSchema.shape.credits,
  videos: tmdbDetailAppendagesSchema.shape.videos,
});

// =============================================================================
// Raw → domain mappers (pure, total)
// =============================================================================

function noDataFromNullableString(value: string | null): NoData<string> {
  // TMDB signals "no string here" with both `null` and `''` for the
  // same field, depending on the endpoint. The domain collapses
  // both into `absent` — a present empty string is never useful.
  return value === null || value.length === 0 ? absent<string>() : present(value);
}

function noDataFromNullableNumber(raw: number | null): NoData<number> {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    return absent<number>();
  }
  return present(raw);
}

function noDataFromMoney(raw: number | null): NoData<ReturnType<typeof moneyFromMajor>> {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    return absent();
  }
  return present(moneyFromMajor(raw, iso4217('USD')));
}

function toRating(voteCount: number, voteAverage: number): RatingReliability {
  return ratingFromVotes(voteCount, voteAverage);
}

function toGenres(rawArr: readonly z.infer<typeof tmdbGenreSchema>[]): readonly Genre[] {
  return rawArr.map((g) => ({ id: g.id, name: g.name }));
}

function toCast(rawArr: readonly z.infer<typeof tmdbCastMemberSchema>[]): readonly CastMember[] {
  return rawArr.map((c) => ({
    id: c.id,
    name: c.name,
    character: noDataFromNullableString(c.character),
    profilePath: noDataFromNullableString(c.profile_path),
  }));
}

function toTrailers(rawArr: readonly z.infer<typeof tmdbTrailerSchema>[]): readonly Trailer[] {
  return rawArr.map((t) => ({
    id: t.id,
    key: t.key,
    site: t.site,
    type: t.type,
    name: t.name,
  }));
}

/**
 * Translates a single TMDB raw movie object into a domain
 * `MovieSummary`. `now` is injectable so tests can pin the
 * `released` / `unreleased` boundary to a known instant.
 */
export function toMovieSummary(raw: unknown, now: Date = new Date()): MovieSummary {
  const parsed = parseWith(tmdbMovieSummarySchema, raw, 'shared/movie-summary');
  return {
    id: parsed.id,
    title: parsed.title,
    overview: parsed.overview,
    posterPath: noDataFromNullableString(parsed.poster_path),
    backdropPath: noDataFromNullableString(parsed.backdrop_path),
    state: classifyRelease(parsed.release_date, now),
    rating: toRating(parsed.vote_count, parsed.vote_average),
    genreIds: parsed.genre_ids,
  };
}

/**
 * Translates a TMDB raw `/movie/{id}` response (with or without
 * the `append_to_response=credits,videos` extension) into a
 * domain `MovieDetail`. `now` is injectable for testing.
 */
export function toMovieDetail(raw: unknown, now: Date = new Date()): MovieDetail {
  const parsed = parseWith(tmdbMovieDetailFullSchema, raw, 'shared/movie-detail');

  const cast: NoData<readonly CastMember[]> =
    parsed.credits === null || parsed.credits === undefined
      ? absent<readonly CastMember[]>()
      : present(toCast(parsed.credits.cast));
  const trailers: NoData<readonly Trailer[]> =
    parsed.videos === null || parsed.videos === undefined
      ? absent<readonly Trailer[]>()
      : present(toTrailers(parsed.videos.results));

  return {
    id: parsed.id,
    title: parsed.title,
    overview: parsed.overview,
    posterPath: noDataFromNullableString(parsed.poster_path),
    backdropPath: noDataFromNullableString(parsed.backdrop_path),
    state: classifyRelease(parsed.release_date, now),
    rating: toRating(parsed.vote_count, parsed.vote_average),
    genreIds: parsed.genre_ids,
    tagline: noDataFromNullableString(parsed.tagline),
    runtime: noDataFromNullableNumber(parsed.runtime),
    genres: toGenres(parsed.genres),
    budget: noDataFromMoney(parsed.budget),
    revenue: noDataFromMoney(parsed.revenue),
    cast,
    trailers,
  };
}
