// presentation/hooks/use-movie-recommendations.ts — recommendations
// for a single movie, fetched in parallel with the detail.

import { useQuery } from '@tanstack/react-query';
import { getMovieRecommendations } from '@/infrastructure/api';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { type PaginatedList } from '@/domain/movie/paginated';

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function useMovieRecommendations(id: number | undefined) {
  return useQuery<PaginatedList<MovieSummary>>({
    queryKey: ['tmdb', 'movie', id, 'recommendations'],
    queryFn: () => {
      if (id === undefined) {
        throw new Error('useMovieRecommendations called without an id');
      }
      return getMovieRecommendations({ id });
    },
    enabled: id !== undefined && Number.isInteger(id) && id > 0,
    staleTime: TEN_MINUTES_MS,
  });
}
