import { z } from 'zod';
import { tmdbHttpClient } from '@/infrastructure/http/client';
import { tmdbMovieSummarySchema, toMovieSummary } from './_shared';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { type PaginatedList } from '@/domain/movie/paginated';

export type TrendingTimeWindow = 'day' | 'week';

export interface TrendingParams {
  readonly timeWindow: TrendingTimeWindow;
  readonly page?: number;
  /** Include adult titles in the result (default false on the server). */
  readonly includeAdult?: boolean;
}

const trendingResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbMovieSummarySchema),
  total_pages: z.number(),
  total_results: z.number(),
});

type TrendingResponse = z.infer<typeof trendingResponseSchema>;

function toQueryParams(params: TrendingParams): Record<string, string | number | boolean> {
  return {
    ...(params.page !== undefined ? { page: params.page } : {}),
    ...(params.includeAdult !== undefined ? { include_adult: params.includeAdult } : {}),
  };
}

function toPaginatedMovies(
  raw: TrendingResponse,
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
 * Fetch the trending movies for the requested time window.
 * Returns a paginated domain list; each result is a validated
 * `MovieSummary` (no raw TMDB JSON leaks).
 */
export function getTrendingMovies(params: TrendingParams): Promise<PaginatedList<MovieSummary>> {
  return tmdbHttpClient
    .get<unknown>(`/3/trending/movie/${params.timeWindow}`, {
      params: toQueryParams(params),
    })
    .then((data) => trendingResponseSchema.parse(data))
    .then((parsed) => toPaginatedMovies(parsed));
}
