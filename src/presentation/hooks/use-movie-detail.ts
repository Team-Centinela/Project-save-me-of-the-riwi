// presentation/hooks/use-movie-detail.ts — single-movie detail fetch.
//
// The hook wraps `getMovieDetail` with the `appendCastAndTrailers`
// flag on, so cast and trailers come back in the same round-trip.
// The recommendation rail is fetched in parallel by the page —
// it's a separate endpoint and the page can render the detail
// header while recommendations are still loading.

import { useQuery } from '@tanstack/react-query';
import { getMovieDetail } from '@/infrastructure/api';
import { type MovieDetail } from '@/domain/movie/movie-detail';

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function useMovieDetail(id: number | undefined) {
  return useQuery<MovieDetail>({
    queryKey: ['tmdb', 'movie', id, 'with-appendages'],
    queryFn: () => {
      if (id === undefined) {
        throw new Error('useMovieDetail called without an id');
      }
      return getMovieDetail({ id, appendCastAndTrailers: true });
    },
    enabled: id !== undefined && Number.isInteger(id) && id > 0,
    staleTime: TEN_MINUTES_MS,
  });
}
