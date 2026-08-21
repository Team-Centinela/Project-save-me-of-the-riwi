// presentation/hooks/use-genres.ts — TMDB movie genres hook.
//
// The genre catalogue is small (under twenty entries) and almost
// never changes. A 24-hour stale time means a single user can
// navigate the explore screen all day without re-fetching.

import { useQuery } from '@tanstack/react-query';
import { getMovieGenres } from '@/infrastructure/api';
import { type Genre } from '@/domain/movie/genre';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function useGenres() {
  return useQuery<readonly Genre[]>({
    queryKey: ['tmdb', 'genres', 'movie'],
    queryFn: getMovieGenres,
    staleTime: ONE_DAY_MS,
  });
}
