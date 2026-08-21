import { z } from 'zod';
import { tmdbHttpClient } from '@/infrastructure/http/client';
import { tmdbMovieSummarySchema, toMovieSummary } from './_shared';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { type PaginatedList } from '@/domain/movie/paginated';

export interface SearchParams {
  /** Free-text query. TMDB returns HTTP 400 if it is missing. */
  readonly query: string;
  /** Page number, 1-indexed (TMDB caps at 500). */
  readonly page?: number;
  /** Include adult titles. Default `false` on the server. */
  readonly includeAdult?: boolean;
  /** Restrict the search to a specific primary release year. */
  readonly primaryReleaseYear?: number;
}

const searchResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbMovieSummarySchema),
  total_pages: z.number(),
  total_results: z.number(),
});

type SearchResponse = z.infer<typeof searchResponseSchema>;

function toQueryParams(params: SearchParams): Record<string, string | number | boolean> {
  return {
    query: params.query,
    ...(params.page !== undefined ? { page: params.page } : {}),
    ...(params.includeAdult !== undefined ? { include_adult: params.includeAdult } : {}),
    ...(params.primaryReleaseYear !== undefined
      ? { primary_release_year: params.primaryReleaseYear }
      : {}),
  };
}

function toPaginatedMovies(
  raw: SearchResponse,
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
 * Search movies by free-text `query`. Returns a paginated domain
 * list; each result is a validated `MovieSummary` (no raw TMDB
 * JSON). Empty results come back as an empty `results` array,
 * not as an error — searching for nothing matched is a normal
 * "empty by filter" state, not a failure.
 */
export function searchMovies(params: SearchParams): Promise<PaginatedList<MovieSummary>> {
  const query = toQueryParams(params);
  return tmdbHttpClient
    .get<unknown>('/3/search/movie', { params: query })
    .then((data) => searchResponseSchema.parse(data))
    .then((parsed) => toPaginatedMovies(parsed));
}
