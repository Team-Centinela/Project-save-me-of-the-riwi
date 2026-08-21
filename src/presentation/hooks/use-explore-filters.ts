// presentation/hooks/use-explore-filters.ts — URL-driven filter state for the
// Explore screen.
//
// Three responsibilities, on purpose:
//
//   1. Parse every URL search param into a typed value, falling back
//      to "no filter" when the value is missing, malformed, or
//      outside the allowed range. A hand-typed absurd value
//      (`?minRating=abc`, `?year=-1`, `?page=foo`) never breaks the
//      page — the consumer always sees a valid `ExploreFilters`.
//   2. Expose a `hasActiveFilter` flag so the screen can distinguish
//      "empty by filter" (show a clear button) from "empty initial"
//      (no clear button).
//   3. Expose a setter that rewrites the URL in place via
//      `useSearchParams`, so changing a filter does not re-mount the
//      component and does not produce a browser-history entry per
//      keystroke. The default sort and page are omitted from the
//      URL so a fresh visit shares the same address as the explicit
//      default.
//
// Sorting is parsed from the URL into a `DiscoverSortOption` via
// the same fallback table the rest of the filter pipeline uses.

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { type DiscoverSortOption } from '@/infrastructure/api';

const CURRENT_YEAR = new Date().getFullYear();

const MIN_YEAR = 1870; // first motion picture ever made
const MAX_YEAR = CURRENT_YEAR + 5; // tolerate a small clock skew into the future

const MIN_RATING = 0;
const MAX_RATING = 10;

const MIN_VOTES = 0;
const MAX_VOTES = 1_000_000;

const MIN_PAGE = 1;
const TMDB_MAX_PAGES = 500;

const SORT_VALUES = [
  'popularity.desc',
  'popularity.asc',
  'release_date.desc',
  'release_date.asc',
  'revenue.desc',
  'revenue.asc',
  'primary_release_date.desc',
  'primary_release_date.asc',
  'vote_average.desc',
  'vote_average.asc',
  'vote_count.desc',
  'vote_count.asc',
  'title.asc',
  'title.desc',
] as const satisfies readonly DiscoverSortOption[];

export const DEFAULT_SORT: DiscoverSortOption = 'popularity.desc';
const SORT_SET: ReadonlySet<DiscoverSortOption> = new Set(SORT_VALUES);

export interface ExploreFilters {
  readonly genreId: number | null;
  readonly primaryReleaseYear: number | null;
  readonly minVoteAverage: number | null;
  readonly minVoteCount: number | null;
  readonly sortBy: DiscoverSortOption;
  readonly page: number;
}

export interface UseExploreFilters {
  readonly filters: ExploreFilters;
  readonly hasActiveFilter: boolean;
  /** True when every search param in the URL parsed cleanly.
   *  False when at least one value was rejected and replaced with
   *  the default. The page can show a "we ignored your bad input"
   *  hint when this is the case. */
  readonly hadInvalidParams: boolean;
  readonly setGenre: (id: number | null) => void;
  readonly setYear: (year: number | null) => void;
  readonly setMinVoteAverage: (value: number | null) => void;
  readonly setMinVoteCount: (value: number | null) => void;
  readonly setSort: (value: DiscoverSortOption) => void;
  readonly setPage: (page: number) => void;
  readonly clearFilters: () => void;
}

function parseIntegerInRange(
  raw: string | null,
  min: number,
  max: number,
): { readonly value: number | null; readonly valid: boolean } {
  if (raw === null || raw === '') return { value: null, valid: true };
  if (!/^-?\d+$/.test(raw)) return { value: null, valid: false };
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { value: null, valid: false };
  }
  return { value: parsed, valid: true };
}

function parseDecimalInRange(
  raw: string | null,
  min: number,
  max: number,
): { readonly value: number | null; readonly valid: boolean } {
  if (raw === null || raw === '') return { value: null, valid: true };
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return { value: null, valid: false };
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { value: null, valid: false };
  }
  return { value: parsed, valid: true };
}

function parseSort(raw: string | null): {
  readonly value: DiscoverSortOption;
  readonly valid: boolean;
} {
  if (raw === null || raw === '') return { value: DEFAULT_SORT, valid: true };
  if (SORT_SET.has(raw as DiscoverSortOption)) {
    return { value: raw as DiscoverSortOption, valid: true };
  }
  return { value: DEFAULT_SORT, valid: false };
}

function setOrDelete(
  next: URLSearchParams,
  key: string,
  value: string | number | null,
  isDefault: (s: string) => boolean,
): void {
  if (value === null || value === '') {
    next.delete(key);
    return;
  }
  const stringValue = String(value);
  if (isDefault(stringValue)) {
    next.delete(key);
    return;
  }
  next.set(key, stringValue);
}

export function useExploreFilters(): UseExploreFilters {
  const [params, setParams] = useSearchParams();

  const parsed = useMemo(() => {
    const genre = parseIntegerInRange(params.get('genre'), 1, Number.MAX_SAFE_INTEGER);
    const year = parseIntegerInRange(params.get('year'), MIN_YEAR, MAX_YEAR);
    const minRating = parseDecimalInRange(params.get('minRating'), MIN_RATING, MAX_RATING);
    const minVotes = parseIntegerInRange(params.get('minVotes'), MIN_VOTES, MAX_VOTES);
    const sort = parseSort(params.get('sort'));
    const page = parseIntegerInRange(params.get('page'), MIN_PAGE, TMDB_MAX_PAGES);

    return {
      genreId: genre.value,
      primaryReleaseYear: year.value,
      minVoteAverage: minRating.value,
      minVoteCount: minVotes.value,
      sortBy: sort.value,
      page: page.value ?? 1,
      hadInvalidParams:
        !genre.valid ||
        !year.valid ||
        !minRating.valid ||
        !minVotes.valid ||
        !sort.valid ||
        !page.valid,
    };
  }, [params]);

  const hasActiveFilter =
    parsed.genreId !== null ||
    parsed.primaryReleaseYear !== null ||
    parsed.minVoteAverage !== null ||
    parsed.minVoteCount !== null ||
    parsed.sortBy !== DEFAULT_SORT ||
    parsed.page !== 1;

  const write = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params);
      mutate(next);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const setGenre = useCallback(
    (id: number | null) => {
      write((next) => {
        setOrDelete(next, 'genre', id, () => false);
        next.delete('page');
      });
    },
    [write],
  );

  const setYear = useCallback(
    (year: number | null) => {
      write((next) => {
        setOrDelete(next, 'year', year, () => false);
        next.delete('page');
      });
    },
    [write],
  );

  const setMinVoteAverage = useCallback(
    (value: number | null) => {
      write((next) => {
        setOrDelete(next, 'minRating', value, (s) => s === '0');
        next.delete('page');
      });
    },
    [write],
  );

  const setMinVoteCount = useCallback(
    (value: number | null) => {
      write((next) => {
        setOrDelete(next, 'minVotes', value, (s) => s === '0');
        next.delete('page');
      });
    },
    [write],
  );

  const setSort = useCallback(
    (value: DiscoverSortOption) => {
      write((next) => {
        setOrDelete(next, 'sort', value, (s) => s === DEFAULT_SORT);
        next.delete('page');
      });
    },
    [write],
  );

  const setPage = useCallback(
    (page: number) => {
      write((next) => {
        setOrDelete(next, 'page', page, (s) => s === '1');
      });
    },
    [write],
  );

  const clearFilters = useCallback(() => {
    setParams(new URLSearchParams(), { replace: true });
  }, [setParams]);

  return {
    filters: {
      genreId: parsed.genreId,
      primaryReleaseYear: parsed.primaryReleaseYear,
      minVoteAverage: parsed.minVoteAverage,
      minVoteCount: parsed.minVoteCount,
      sortBy: parsed.sortBy,
      page: parsed.page,
    },
    hasActiveFilter,
    hadInvalidParams: parsed.hadInvalidParams,
    setGenre,
    setYear,
    setMinVoteAverage,
    setMinVoteCount,
    setSort,
    setPage,
    clearFilters,
  };
}

// Internal exports for tests — not part of the public surface.
export const __test = {
  parseIntegerInRange,
  parseDecimalInRange,
  parseSort,
  SORT_VALUES,
  DEFAULT_SORT,
  MIN_YEAR,
  MAX_YEAR,
  MIN_RATING,
  MAX_RATING,
  MIN_VOTES,
  MAX_VOTES,
  MIN_PAGE,
  TMDB_MAX_PAGES,
};
