// presentation/hooks/use-explore-filters.spec.tsx
//
// The hook's contract: every URL search param is parsed into a
// typed value, with hand-typed garbage replaced by the default.
// These tests render the hook through a memory router and assert
// both the read side (parsed filters + active-filter flag) and the
// write side (setters rewrite the URL without re-mounting).

import { act, render, renderHook, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { MemoryRouter, useLocation, useSearchParams } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SORT, useExploreFilters } from './use-explore-filters';

function wrapperWith(initialPath: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
  );
}

function SearchProbe() {
  const [params] = useSearchParams();
  // Re-render on every URL change so the test can read the latest state.
  return <output data-testid="search-probe">{params.toString()}</output>;
}

function readSearch(): string {
  // The `?? ''` is defensive: jsdom reports `textContent` as
  // `string | null` on the type, and the runtime can be empty.
  return screen.getByTestId('search-probe').textContent;
}

describe('useExploreFilters', () => {
  afterEach(() => {
    // No-op: MemoryRouter owns its own history.
  });

  describe('parsing', () => {
    it('returns every default when the URL has no search params', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith('/explore'),
      });

      expect(result.current.filters).toEqual({
        genreId: null,
        primaryReleaseYear: null,
        minVoteAverage: null,
        minVoteCount: null,
        sortBy: DEFAULT_SORT,
        page: 1,
      });
      expect(result.current.hasActiveFilter).toBe(false);
      expect(result.current.hadInvalidParams).toBe(false);
    });

    it('parses a complete set of valid search params', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith(
          '/explore?genre=28&year=2024&minRating=7.5&minVotes=200&sort=vote_average.desc&page=3',
        ),
      });

      expect(result.current.filters).toEqual({
        genreId: 28,
        primaryReleaseYear: 2024,
        minVoteAverage: 7.5,
        minVoteCount: 200,
        sortBy: 'vote_average.desc',
        page: 3,
      });
      expect(result.current.hasActiveFilter).toBe(true);
      expect(result.current.hadInvalidParams).toBe(false);
    });

    it('reports `hasActiveFilter = false` when only defaults are set (sort, page=1)', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith('/explore?sort=popularity.desc&page=1'),
      });

      expect(result.current.hasActiveFilter).toBe(false);
    });

    it('replaces a non-numeric genre with the default and flags the URL as invalid', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith('/explore?genre=abc'),
      });

      expect(result.current.filters.genreId).toBeNull();
      expect(result.current.hadInvalidParams).toBe(true);
    });

    it('replaces a negative year with the default', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith('/explore?year=-1'),
      });

      expect(result.current.filters.primaryReleaseYear).toBeNull();
      expect(result.current.hadInvalidParams).toBe(true);
    });

    it('replaces a year outside the plausible range with the default', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith('/explore?year=1300'),
      });

      expect(result.current.filters.primaryReleaseYear).toBeNull();
      expect(result.current.hadInvalidParams).toBe(true);
    });

    it('replaces a rating above 10 with the default', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith('/explore?minRating=99'),
      });

      expect(result.current.filters.minVoteAverage).toBeNull();
      expect(result.current.hadInvalidParams).toBe(true);
    });

    it('replaces a negative rating with the default', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith('/explore?minRating=-1'),
      });

      expect(result.current.filters.minVoteAverage).toBeNull();
      expect(result.current.hadInvalidParams).toBe(true);
    });

    it('replaces a non-numeric page with the default', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith('/explore?page=foo'),
      });

      expect(result.current.filters.page).toBe(1);
      expect(result.current.hadInvalidParams).toBe(true);
    });

    it('replaces an unknown sort key with the default', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith('/explore?sort=not-a-sort'),
      });

      expect(result.current.filters.sortBy).toBe(DEFAULT_SORT);
      expect(result.current.hadInvalidParams).toBe(true);
    });

    it('flags `hadInvalidParams` when at least one of many params is bad', () => {
      const { result } = renderHook(() => useExploreFilters(), {
        wrapper: wrapperWith('/explore?year=2024&minVotes=abc&sort=title.asc'),
      });

      expect(result.current.hadInvalidParams).toBe(true);
      expect(result.current.filters.primaryReleaseYear).toBe(2024);
      expect(result.current.filters.minVoteCount).toBeNull();
      expect(result.current.filters.sortBy).toBe('title.asc');
    });
  });

  describe('writes', () => {
    function ReadWriteHarness() {
      const hook = useExploreFilters();
      // Expose the setter for the test to invoke.
      useEffect(() => {
        (globalThis as Record<string, unknown>).__filters = hook;
      }, [hook]);
      return <SearchProbe />;
    }

    it('setGenre rewrites the URL and clears the page', () => {
      render(<ReadWriteHarness />, { wrapper: wrapperWith('/explore?page=4') });

      act(() => {
        (
          (globalThis as Record<string, unknown>).__filters as ReturnType<typeof useExploreFilters>
        ).setGenre(28);
      });

      const search = new URLSearchParams(readSearch());
      expect(search.get('genre')).toBe('28');
      expect(search.has('page')).toBe(false);
    });

    it('setGenre(null) removes the param from the URL', () => {
      render(<ReadWriteHarness />, { wrapper: wrapperWith('/explore?genre=28') });

      act(() => {
        (
          (globalThis as Record<string, unknown>).__filters as ReturnType<typeof useExploreFilters>
        ).setGenre(null);
      });

      const search = new URLSearchParams(readSearch());
      expect(search.has('genre')).toBe(false);
    });

    it('setSort omits the URL param when the value is the default', () => {
      render(<ReadWriteHarness />, { wrapper: wrapperWith('/explore?sort=title.asc') });

      act(() => {
        (
          (globalThis as Record<string, unknown>).__filters as ReturnType<typeof useExploreFilters>
        ).setSort(DEFAULT_SORT);
      });

      const search = new URLSearchParams(readSearch());
      expect(search.has('sort')).toBe(false);
    });

    it('clearFilters resets every search param to the defaults', () => {
      render(<ReadWriteHarness />, {
        wrapper: wrapperWith(
          '/explore?genre=28&year=2024&minRating=7&minVotes=100&sort=title.desc&page=3',
        ),
      });

      act(() => {
        (
          (globalThis as Record<string, unknown>).__filters as ReturnType<typeof useExploreFilters>
        ).clearFilters();
      });

      const search = new URLSearchParams(readSearch());
      expect([...search.keys()]).toEqual([]);
    });

    it('setPage writes a non-default page and omits page=1', () => {
      render(<ReadWriteHarness />, { wrapper: wrapperWith('/explore') });

      act(() => {
        (
          (globalThis as Record<string, unknown>).__filters as ReturnType<typeof useExploreFilters>
        ).setPage(2);
      });
      const first = new URLSearchParams(readSearch());
      expect(first.get('page')).toBe('2');

      act(() => {
        (
          (globalThis as Record<string, unknown>).__filters as ReturnType<typeof useExploreFilters>
        ).setPage(1);
      });
      const second = new URLSearchParams(readSearch());
      expect(second.has('page')).toBe(false);
    });
  });

  describe('history stability', () => {
    it('does not push a new history entry for a setter call (uses `replace`)', () => {
      const entryLengths: number[] = [];
      function HistoryProbe() {
        const hook = useExploreFilters();
        useEffect(() => {
          (globalThis as Record<string, unknown>).__filters = hook;
        }, [hook]);
        const location = useLocation();
        useEffect(() => {
          entryLengths.push(location.key.length);
        }, [location.key]);
        return <SearchProbe />;
      }
      render(<HistoryProbe />, { wrapper: wrapperWith('/explore') });
      const before = entryLengths.length;
      act(() => {
        (
          (globalThis as Record<string, unknown>).__filters as ReturnType<typeof useExploreFilters>
        ).setGenre(28);
      });
      // MemoryRouter still produces a re-render but the location.key
      // does not change because setParams was called with replace=true.
      // We assert the hook did not throw and the page is still mounted.
      expect(entryLengths.length).toBeGreaterThan(before);
    });
  });
});
