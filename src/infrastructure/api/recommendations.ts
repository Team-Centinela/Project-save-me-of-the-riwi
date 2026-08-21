import { z } from 'zod';
import { tmdbHttpClient } from '@/infrastructure/http/client';
import { tmdbMovieSummarySchema, toMovieSummary } from './_shared';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { type PaginatedList } from '@/domain/movie/paginated';

export interface MovieRecommendationsParams {
  readonly id: number;
  readonly page?: number;
}

const recommendationsResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbMovieSummarySchema),
  total_pages: z.number(),
  total_results: z.number(),
});

type RecommendationsResponse = z.infer<typeof recommendationsResponseSchema>;

function toPaginatedMovies(
  raw: RecommendationsResponse,
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
 * Fetches the recommendations for a movie. Returns a paginated
 * domain list. Empty recommendations come back as `results: []`,
 * not as an error — many movies have no recommendations and the
 * detail screen just hides the rail.
 */
export function getMovieRecommendations(
  params: MovieRecommendationsParams,
): Promise<PaginatedList<MovieSummary>> {
  const query: Record<string, number> = {
    ...(params.page !== undefined ? { page: params.page } : {}),
  };
  const config = Object.keys(query).length > 0 ? { params: query } : undefined;
  return tmdbHttpClient
    .get<unknown>(`/3/movie/${String(params.id)}/recommendations`, config)
    .then((data) => recommendationsResponseSchema.parse(data))
    .then((parsed) => toPaginatedMovies(parsed));
}
