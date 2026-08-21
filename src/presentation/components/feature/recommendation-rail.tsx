// presentation/components/feature/recommendation-rail.tsx — the
// bottom-of-detail rail with similar movies.
//
// Renders the same MovieCard component used by the explore and
// home grids so the visual language is consistent. A `useQuery`
// is not used here — the parent page owns the fetch and passes
// the list down. The component is therefore a pure renderer.

import type { ReactNode } from 'react';
import { MovieCard } from '@/presentation/components/feature/movie-card';
import { EmptyState } from '@/presentation/components/ui/empty-state';
import { type ImageConfiguration } from '@/domain/configuration/image-configuration';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { copy } from '@/presentation/copy/strings';

export interface RecommendationRailProps {
  readonly movies: readonly MovieSummary[];
  readonly imageConfig: ImageConfiguration | undefined;
  readonly locale: string;
  readonly loading: boolean;
}

export function RecommendationRail({
  movies,
  imageConfig,
  locale,
  loading,
}: RecommendationRailProps): ReactNode {
  if (loading) {
    return (
      <section data-testid="recommendations-loading" aria-label={copy.detail.recommendations}>
        <h2 className="text-lg font-semibold text-ink">{copy.detail.recommendations}</h2>
        <ul
          className="mt-4 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-5"
          data-testid="recommendations-skeleton"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              aria-hidden
              className="aspect-poster w-full animate-pulse rounded-card bg-surface-raised"
            />
          ))}
        </ul>
      </section>
    );
  }
  if (movies.length === 0) {
    return (
      <section data-testid="recommendations-empty" aria-label={copy.detail.recommendations}>
        <h2 className="text-lg font-semibold text-ink">{copy.detail.recommendations}</h2>
        <div className="mt-4">
          <EmptyState title={copy.detail.noRecommendations} />
        </div>
      </section>
    );
  }
  return (
    <section data-testid="recommendations-list" aria-label={copy.detail.recommendations}>
      <h2 className="text-lg font-semibold text-ink">{copy.detail.recommendations}</h2>
      <ul
        className="mt-4 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-5"
        data-testid="recommendations-grid"
      >
        {movies.map((m) => (
          <li key={m.id}>
            <MovieCard movie={m} imageConfig={imageConfig} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}
