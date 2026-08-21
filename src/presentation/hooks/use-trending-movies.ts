// presentation/hooks/use-trending-movies.ts — the weekly-trending feed.
//
// Issues #14 (Home) only needs page 1 of the weekly window. We
// keep a single `useQuery` (not infinite) because the home grid is
// not paged — the explore screen is the path to "see more".

import { useQuery } from '@tanstack/react-query';
import { getTrendingMovies } from '@/infrastructure/api';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { type PaginatedList } from '@/domain/movie/paginated';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function useTrendingMovies() {
  return useQuery<PaginatedList<MovieSummary>>({
    queryKey: ['tmdb', 'trending', 'movie', 'week'],
    queryFn: () => getTrendingMovies({ timeWindow: 'week' }),
    staleTime: FIVE_MINUTES_MS,
  });
}
