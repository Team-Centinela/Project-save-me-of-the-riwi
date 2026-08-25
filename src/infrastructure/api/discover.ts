import { z } from 'zod';
import { tmdbHttpClient } from '@/infrastructure/http/client';
import { clampPage, parseWith, tmdbMovieSummarySchema, toMovieSummary } from './_shared';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { type PaginatedList } from '@/domain/movie/paginated';

/**
 * TMDB documented sort orders. The filter UI exposes a subset;
 * passing an unsupported string here returns the default
 * (`popularity.desc`) on TMDB's side, but the module sends
 * whatever the caller asks for — the schema for filters is the
 * boundary, not TMDB's.
 */
export type DiscoverSortOption =
  | 'popularity.asc'
  | 'popularity.desc'
  | 'release_date.asc'
  | 'release_date.desc'
  | 'revenue.asc'
  | 'revenue.desc'
  | 'primary_release_date.asc'
  | 'primary_release_date.desc'
  | 'vote_average.asc'
  | 'vote_average.desc'
  | 'vote_count.asc'
  | 'vote_count.desc'
  | 'title.asc'
  | 'title.desc';

export interface DiscoverFilters {
  /** Comma-separated list of TMDB genre ids, e.g. `[28, 12]`. */
  readonly genreIds?: readonly number[];
  /** Filter by primary release year (e.g. `2024`). */
  readonly primaryReleaseYear?: number;
  /** Minimum `vote_average` (e.g. `7`). */
  readonly minVoteAverage?: number;
  /** Minimum `vote_count` for the rating to count (e.g. `100`). */
  readonly minVoteCount?: number;
  /** Sort order (default `popularity.desc` on the server). */
  readonly sortBy?: DiscoverSortOption;
  /** Page number, 1-indexed (TMDB caps at 500). */
  readonly page?: number;
  /** Include adult titles in the result (default false on the server). */
  readonly includeAdult?: boolean;
}

const discoverResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbMovieSummarySchema),
  total_pages: z.number(),
  total_results: z.number(),
});

type DiscoverResponse = z.infer<typeof discoverResponseSchema>;

function toQueryParams(filters: DiscoverFilters): Record<string, string | number | boolean> {
  // Spread construction keeps every key a literal that the linter
  // accepts as dot-notation friendly while keeping the param object
  // sparse (unset filters are not sent).
  const page = clampPage(filters.page);
  return {
    ...(filters.genreIds && filters.genreIds.length > 0
      ? { with_genres: filters.genreIds.join(',') }
      : {}),
    ...(filters.primaryReleaseYear !== undefined
      ? { primary_release_year: filters.primaryReleaseYear }
      : {}),
    ...(filters.minVoteAverage !== undefined ? { 'vote_average.gte': filters.minVoteAverage } : {}),
    ...(filters.minVoteCount !== undefined ? { 'vote_count.gte': filters.minVoteCount } : {}),
    ...(filters.sortBy !== undefined ? { sort_by: filters.sortBy } : {}),
    ...(page !== undefined ? { page } : {}),
    ...(filters.includeAdult !== undefined ? { include_adult: filters.includeAdult } : {}),
  };
}

function toPaginatedMovies(
  raw: DiscoverResponse,
  now: Date = new Date(),
): PaginatedList<MovieSummary> {
  return {
    page: raw.page,
    results: raw.results.map((m) => toMovieSummary(m, now)),
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
  };
}

/**
 * Discover movies matching the given filters. Returns a paginated
 * domain list — `results` are `MovieSummary` objects, not raw TMDB
 * JSON. A response whose shape drifted (a renamed field, a string
 * where a number belongs) surfaces as a `TmdbSchemaError`, never
 * as a raw `ZodError`. The requested page is clamped to TMDB's
 * 500-page cap before the request leaves this module.
 */
export function discoverMovies(
  filters: DiscoverFilters = {},
): Promise<PaginatedList<MovieSummary>> {
  const params = toQueryParams(filters);
  return tmdbHttpClient
    .get<unknown>('/3/discover/movie', { params })
    .then((data) => parseWith(discoverResponseSchema, data, '/3/discover/movie'))
    .then((parsed) => toPaginatedMovies(parsed));
}
