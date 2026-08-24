// presentation/hooks/use-discover-movies.ts — paginated discover feed.
//
// Each filter combination has its own query key, so changing a
// filter starts a fresh page-1 fetch. Pagination uses TanStack
// Query's `useInfiniteQuery`; the page token is the next page
// number, or `undefined` once the last page is reached.
//
// TMDB caps responses at 500 pages. The cap constant lives in
// `use-explore-filters.ts` (it guards the `?page=` URL param)
// and is imported here so the literal exists in exactly one
// place — the two-layer guard (URL parser + this hook) can
// never drift apart.

import { useInfiniteQuery } from '@tanstack/react-query';
import {
  discoverMovies,
  type DiscoverFilters,
  type DiscoverSortOption,
} from '@/infrastructure/api';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { type PaginatedList } from '@/domain/movie/paginated';
import { TMDB_MAX_PAGES } from './use-explore-filters';

const TEN_MINUTES_MS = 10 * 60 * 1000;

export interface UseDiscoverMoviesArgs {
  readonly genreIds?: readonly number[];
  readonly primaryReleaseYear?: number;
  readonly minVoteAverage?: number;
  readonly minVoteCount?: number;
  readonly sortBy?: DiscoverSortOption;
}

export function useDiscoverMovies(filters: UseDiscoverMoviesArgs) {
  const discoverFilters: DiscoverFilters = {
    ...(filters.genreIds !== undefined && filters.genreIds.length > 0
      ? { genreIds: filters.genreIds }
      : {}),
    ...(filters.primaryReleaseYear !== undefined
      ? { primaryReleaseYear: filters.primaryReleaseYear }
      : {}),
    ...(filters.minVoteAverage !== undefined ? { minVoteAverage: filters.minVoteAverage } : {}),
    ...(filters.minVoteCount !== undefined ? { minVoteCount: filters.minVoteCount } : {}),
    ...(filters.sortBy !== undefined ? { sortBy: filters.sortBy } : {}),
  };

  return useInfiniteQuery<PaginatedList<MovieSummary>>({
    queryKey: ['tmdb', 'discover', 'movie', discoverFilters],
    queryFn: ({ pageParam }) =>
      discoverMovies({ ...discoverFilters, page: typeof pageParam === 'number' ? pageParam : 1 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Hard cap: even if `total_pages` is bigger, we never ask
      // for page > TMDB_MAX_PAGES. This is the defensive half of
      // the two-layer guard.
      if (lastPage.page >= TMDB_MAX_PAGES) return undefined;
      return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: TEN_MINUTES_MS,
  });
}
