// presentation/routes/home-page.tsx — the index route.
//
// The Home page is the entry point. It shows the weekly trending
// movies (the most-shared weekly list on TMDB) and a single CTA
// to the explore screen, which is the path to "see more".
//
// Four states, by design:
//
//   1. loading  — a grid of skeletons that match the card shape so
//                 the page does not reflow when the bytes arrive.
//   2. error    — an error state with a retry button.
//   3. empty    — the API returned no rows (rare, but possible on
//                 a fresh TMDB account with no traffic).
//   4. success  — the trending grid plus a CTA to the explore
//                 screen, which is the path to "see more".

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { MovieCard } from '@/presentation/components/feature/movie-card';
import { EmptyState } from '@/presentation/components/ui/empty-state';
import { ErrorState } from '@/presentation/components/ui/error-state';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useImageConfig } from '@/presentation/hooks/use-image-config';
import { useLocale } from '@/presentation/hooks/use-locale';
import { useTrendingMovies } from '@/presentation/hooks/use-trending-movies';
import { useDocumentTitle } from '@/presentation/hooks/use-document-title';
import { copy } from '@/presentation/copy/strings';

const SKELETON_CARD_COUNT = 10;

export function HomePage(): ReactNode {
  const locale = useLocale();
  const config = useImageConfig();
  const trending = useTrendingMovies();
  useDocumentTitle(copy.home.title);

  if (trending.isLoading) {
    return (
      <section aria-busy="true" aria-label={copy.home.loadingAria} data-testid="home-loading">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{copy.home.title}</h1>
        <p className="mt-2 max-w-prose text-ink-muted">{copy.home.description}</p>
        <div
          className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
          data-testid="home-skeleton"
        >
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
            <Skeleton key={i} variant="card" className="border-transparent" />
          ))}
        </div>
      </section>
    );
  }

  if (trending.isError) {
    return (
      <section data-testid="home-error">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{copy.home.title}</h1>
        <div className="mt-6">
          <ErrorState
            title={copy.errors.title}
            description={copy.errors.description}
            action={{
              label: copy.errors.retry,
              onClick: () => {
                void trending.refetch();
              },
            }}
          />
        </div>
      </section>
    );
  }

  const movies = trending.data?.results ?? [];

  return (
    <section aria-labelledby="home-title" data-testid="home-page">
      <h1 id="home-title" className="text-3xl font-semibold tracking-tight text-ink">
        {copy.home.title}
      </h1>
      <p className="mt-2 max-w-prose text-ink-muted">{copy.home.description}</p>

      {movies.length === 0 ? (
        <div className="mt-6" data-testid="home-empty">
          <EmptyState title={copy.home.empty} />
        </div>
      ) : (
        <>
          <ul
            className="mt-6 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-5"
            data-testid="home-grid"
          >
            {movies.map((m) => (
              <li key={m.id}>
                <MovieCard movie={m} imageConfig={config.data?.images} locale={locale} />
              </li>
            ))}
          </ul>
          <div className="mt-8 flex justify-center">
            <Link
              to="/explore"
              data-testid="home-explore-cta"
              className="inline-flex min-h-touch items-center justify-center rounded-card bg-brand px-6 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {copy.home.exploreCta}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
