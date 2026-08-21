// presentation/routes/explore-page.tsx — the explore screen.
//
// Four states, by design:
//
//   1. loading  — the data is on its way; show skeletons that
//                 match the card silhouette so the page does not
//                 reflow when the bytes arrive.
//   2. error    — the request failed; show a retry button that
//                 calls `refetch()`.
//   3. empty    — the API returned no rows AND no filter is
//                 active. Show a generic empty state.
//   4. filtered — the API returned no rows AND a filter is
//                 active. Show an empty state with a "Clear
//                 filters" button that resets the URL.
//
// Filters live in the URL, not in component state. The hook
// `useExploreFilters` parses them, validates them, and rewrites
// the URL on every change. A hand-typed absurd value
// (`?minRating=abc`, `?year=-1`) is replaced with the default
// and the screen keeps working.

import { type ReactNode } from 'react';
import { type DiscoverSortOption } from '@/infrastructure/api';
import { MovieGrid } from '@/presentation/components/feature/movie-grid';
import { EmptyState } from '@/presentation/components/ui/empty-state';
import { ErrorState } from '@/presentation/components/ui/error-state';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useDiscoverMovies } from '@/presentation/hooks/use-discover-movies';
import { useExploreFilters } from '@/presentation/hooks/use-explore-filters';
import { useGenres } from '@/presentation/hooks/use-genres';
import { useImageConfig } from '@/presentation/hooks/use-image-config';
import { copy } from '@/presentation/copy/strings';
import { cn } from '@/presentation/lib/cn';

const SKELETON_CARD_COUNT = 10;

function SortOption({
  value,
  label,
}: {
  readonly value: DiscoverSortOption;
  readonly label: string;
}) {
  return (
    <option value={value} data-testid={`sort-option-${value}`}>
      {label}
    </option>
  );
}

export function ExplorePage(): ReactNode {
  const filters = useExploreFilters();
  const config = useImageConfig();
  const genres = useGenres();
  const discover = useDiscoverMovies({
    ...(filters.filters.genreId !== null ? { genreIds: [filters.filters.genreId] } : {}),
    ...(filters.filters.primaryReleaseYear !== null
      ? { primaryReleaseYear: filters.filters.primaryReleaseYear }
      : {}),
    ...(filters.filters.minVoteAverage !== null
      ? { minVoteAverage: filters.filters.minVoteAverage }
      : {}),
    ...(filters.filters.minVoteCount !== null
      ? { minVoteCount: filters.filters.minVoteCount }
      : {}),
    sortBy: filters.filters.sortBy,
  });

  if (discover.isLoading) {
    return (
      <section aria-busy="true" aria-label={copy.explore.loadingAria} data-testid="explore-loading">
        <h1 className="text-3xl font-semibold text-ink">{copy.explore.title}</h1>
        <p className="mt-2 max-w-prose text-ink-muted">{copy.explore.description}</p>
        <div
          className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
          data-testid="explore-skeleton"
        >
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
            <Skeleton key={i} variant="card" className="border-transparent" />
          ))}
        </div>
      </section>
    );
  }

  if (discover.isError) {
    return (
      <section data-testid="explore-error">
        <h1 className="text-3xl font-semibold text-ink">{copy.explore.title}</h1>
        <div className="mt-6">
          <ErrorState
            title={copy.errors.title}
            description={copy.errors.description}
            action={{
              label: copy.errors.retry,
              onClick: () => {
                void discover.refetch();
              },
            }}
          />
        </div>
      </section>
    );
  }

  const pages = discover.data?.pages ?? [];
  const movies = pages.flatMap((page) => page.results);

  return (
    <section data-testid="explore-page">
      <h1 className="text-3xl font-semibold text-ink">{copy.explore.title}</h1>
      <p className="mt-2 max-w-prose text-ink-muted">{copy.explore.description}</p>

      <fieldset
        className={cn(
          'mt-6 grid grid-cols-1 gap-3 rounded-card border border-ink-muted/20 bg-surface-raised p-4',
          'sm:grid-cols-2 lg:grid-cols-5',
        )}
        data-testid="explore-filters"
      >
        <legend className="px-1 text-sm text-ink-muted">{copy.explore.filters.title}</legend>

        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          <span>{copy.explore.filters.genre}</span>
          <select
            data-testid="filter-genre"
            value={filters.filters.genreId === null ? '' : String(filters.filters.genreId)}
            onChange={(event) => {
              const value = event.target.value;
              filters.setGenre(value === '' ? null : Number.parseInt(value, 10));
            }}
            className="min-h-touch rounded-card border border-ink-muted/30 bg-surface px-2 text-sm text-ink"
          >
            <option value="">{copy.explore.filters.any}</option>
            {(genres.data ?? []).map((genre) => (
              <option key={genre.id} value={String(genre.id)}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          <span>{copy.explore.filters.year}</span>
          <input
            type="number"
            inputMode="numeric"
            data-testid="filter-year"
            min={1870}
            max={new Date().getFullYear() + 1}
            value={filters.filters.primaryReleaseYear ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              filters.setYear(value === '' ? null : Number.parseInt(value, 10));
            }}
            className="min-h-touch rounded-card border border-ink-muted/30 bg-surface px-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          <span>{copy.explore.filters.minRating}</span>
          <input
            type="number"
            inputMode="decimal"
            data-testid="filter-min-rating"
            min={0}
            max={10}
            step={0.1}
            value={filters.filters.minVoteAverage ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              filters.setMinVoteAverage(value === '' ? null : Number.parseFloat(value));
            }}
            className="min-h-touch rounded-card border border-ink-muted/30 bg-surface px-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          <span>{copy.explore.filters.minVotes}</span>
          <input
            type="number"
            inputMode="numeric"
            data-testid="filter-min-votes"
            min={0}
            value={filters.filters.minVoteCount ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              filters.setMinVoteCount(value === '' ? null : Number.parseInt(value, 10));
            }}
            className="min-h-touch rounded-card border border-ink-muted/30 bg-surface px-2 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          <span>{copy.explore.filters.sortBy}</span>
          <select
            data-testid="filter-sort"
            value={filters.filters.sortBy}
            onChange={(event) => {
              filters.setSort(event.target.value as DiscoverSortOption);
            }}
            className="min-h-touch rounded-card border border-ink-muted/30 bg-surface px-2 text-sm text-ink"
          >
            <SortOption value="popularity.desc" label={copy.explore.sortOptions.popularityDesc} />
            <SortOption value="popularity.asc" label={copy.explore.sortOptions.popularityAsc} />
            <SortOption
              value="release_date.desc"
              label={copy.explore.sortOptions.releaseDateDesc}
            />
            <SortOption value="release_date.asc" label={copy.explore.sortOptions.releaseDateAsc} />
            <SortOption value="vote_average.desc" label={copy.explore.sortOptions.ratingDesc} />
            <SortOption value="vote_average.asc" label={copy.explore.sortOptions.ratingAsc} />
            <SortOption value="title.asc" label={copy.explore.sortOptions.titleAsc} />
            <SortOption value="title.desc" label={copy.explore.sortOptions.titleDesc} />
          </select>
        </label>
      </fieldset>

      {filters.hadInvalidParams && (
        <p
          role="status"
          data-testid="invalid-params-hint"
          className="mt-3 text-xs text-status-unreleased"
        >
          Some filters in the URL were ignored because they were out of range.
        </p>
      )}

      {movies.length === 0 ? (
        <div className="mt-6" data-testid="explore-empty">
          {filters.hasActiveFilter ? (
            <EmptyState
              title={copy.explore.emptyByFilter}
              action={{
                label: copy.explore.clearFiltersAction,
                onClick: filters.clearFilters,
              }}
            />
          ) : (
            <EmptyState title={copy.explore.emptyInitial} />
          )}
        </div>
      ) : (
        <>
          <div className="mt-6">
            <MovieGrid movies={movies} imageConfig={config.data?.images} locale="en-US" />
          </div>
          {discover.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                data-testid="load-more"
                disabled={discover.isFetchingNextPage}
                onClick={() => {
                  void discover.fetchNextPage();
                }}
                className="inline-flex min-h-touch items-center justify-center rounded-card border border-brand px-6 text-brand transition-opacity hover:bg-brand/10 disabled:opacity-50"
              >
                {discover.isFetchingNextPage ? copy.explore.loading : copy.explore.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
