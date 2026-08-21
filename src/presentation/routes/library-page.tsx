// presentation/routes/library-page.tsx — the local library screen.
//
// Three states (the four of the issue minus the initial-empty,
// which is folded into the empty state because the initial
// fetch is fast and indistinguishable from a legitimately empty
// library):
//
//   1. loading  — skeletons that match the card silhouette.
//   2. error    — error state with a retry button.
//   3. empty    — the library is empty (either the user has
//                 not saved anything, or the storage was
//                 corrupted and reset). The empty state shows
//                 a CTA to /explore, per the issue.
//   4. success  — the saved movies, each with a "remove" CTA
//                 that calls the optimistic mutation.
//
// A one-time `corrupted` banner is rendered above the grid
// when the storage was reset, so the user knows why their
// library looks empty.

import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { MovieCard } from '@/presentation/components/feature/movie-card';
import { EmptyState } from '@/presentation/components/ui/empty-state';
import { ErrorState } from '@/presentation/components/ui/error-state';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useImageConfig } from '@/presentation/hooks/use-image-config';
import { useLibrary } from '@/presentation/hooks/use-library';
import { useLocale } from '@/presentation/hooks/use-locale';
import { useDocumentTitle } from '@/presentation/hooks/use-document-title';
import { entryToMovieSummary } from '@/domain/library/library-entry';
import { copy } from '@/presentation/copy/strings';

const SKELETON_CARD_COUNT = 6;

export function LibraryPage(): ReactNode {
  const locale = useLocale();
  const config = useImageConfig();
  const library = useLibrary();
  useDocumentTitle(copy.library.title);

  if (library.isLoading) {
    return (
      <section aria-busy="true" aria-label={copy.library.loadingAria} data-testid="library-loading">
        <h1 className="text-3xl font-semibold text-ink">{copy.library.title}</h1>
        <div
          className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
          data-testid="library-skeleton"
        >
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
            <Skeleton key={i} variant="card" className="border-transparent" />
          ))}
        </div>
      </section>
    );
  }

  if (library.isError) {
    return (
      <section data-testid="library-error">
        <h1 className="text-3xl font-semibold text-ink">{copy.library.title}</h1>
        <div className="mt-6">
          <ErrorState title={copy.library.error} description={copy.errors.description} />
        </div>
      </section>
    );
  }

  return (
    <section data-testid="library-page" aria-labelledby="library-title">
      <h1 id="library-title" className="text-3xl font-semibold text-ink">
        {copy.library.title}
      </h1>
      <p className="mt-2 max-w-prose text-ink-muted">{copy.library.description}</p>

      {library.corrupted && (
        <div
          role="status"
          data-testid="library-corrupted-notice"
          className="mt-4 rounded-card border border-status-unreleased/40 bg-status-unreleased/10 px-4 py-3 text-sm text-status-unreleased"
        >
          {copy.library.corruptedNotice}
        </div>
      )}

      {library.entries.length === 0 ? (
        <div className="mt-6" data-testid="library-empty">
          <EmptyState title={copy.library.empty} description={copy.library.emptyHint} />
          <div className="mt-6 flex justify-center">
            <Link
              to="/explore"
              data-testid="library-explore-cta"
              className="inline-flex min-h-touch items-center justify-center rounded-card bg-brand px-6 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {copy.library.exploreCta}
            </Link>
          </div>
        </div>
      ) : (
        <ul
          className="mt-6 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-5"
          data-testid="library-grid"
        >
          {library.entries.map((entry) => {
            const movie = entryToMovieSummary(entry);
            return (
              <li key={entry.id} data-testid="library-entry" data-entry-id={entry.id}>
                <MovieCard movie={movie} imageConfig={config.data?.images} locale={locale} />
                <button
                  type="button"
                  data-testid="library-remove"
                  data-entry-id={entry.id}
                  onClick={() => {
                    void library.remove(entry.id);
                  }}
                  className="mt-2 inline-flex min-h-touch w-full items-center justify-center rounded-card border border-ink-muted/30 bg-surface px-4 text-sm text-ink-muted transition-colors hover:border-danger/40 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
                >
                  {copy.library.removeFromLibrary}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
