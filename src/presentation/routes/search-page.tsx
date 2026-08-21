// presentation/routes/search-page.tsx — the search screen.
//
// Three responsibilities, on purpose:
//
//   1. Render a single search input. Typing fires a debounced
//      query: 10 keystrokes in 300ms trigger one request, not
//      ten. The debounce lives in `useDebouncedValue` and the
//      in-flight cancellation lives in `useSearchResults`.
//
//   2. Show the four states with a clear distinction between
//      "no query yet" (no input), "query too short" (≤1 char),
//      "no results" (API returned zero rows), and "results"
//      (API returned rows). Each empty state has its own copy
//      and its own data-testid for testing.
//
//   3. Surface the search to assistive tech. The input has an
//      accessible label, the results live in an aria-live region
//      so a screen reader announces the new results as they
//      arrive, and the loading state has aria-busy.

import { useState, type ReactNode } from 'react';
import { MovieCard } from '@/presentation/components/feature/movie-card';
import { EmptyState } from '@/presentation/components/ui/empty-state';
import { ErrorState } from '@/presentation/components/ui/error-state';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useDebouncedValue } from '@/presentation/hooks/use-debounced-value';
import { useImageConfig } from '@/presentation/hooks/use-image-config';
import { useLocale } from '@/presentation/hooks/use-locale';
import { useSearchResults } from '@/presentation/hooks/use-search-results';
import { useDocumentTitle } from '@/presentation/hooks/use-document-title';
import { copy } from '@/presentation/copy/strings';
import { cn } from '@/presentation/lib/cn';

const DEBOUNCE_MS = 300;

export function SearchPage(): ReactNode {
  const locale = useLocale();
  const config = useImageConfig();
  const [rawQuery, setRawQuery] = useState('');
  const debounced = useDebouncedValue(rawQuery, DEBOUNCE_MS);
  const { trimmed, shouldSearch, state, retry } = useSearchResults(debounced);
  useDocumentTitle(copy.search.title);

  const data = shouldSearch ? state.data : undefined;
  const showLoading = shouldSearch && state.loading;
  const showError = shouldSearch && state.error !== null;
  const showEmptyResults =
    shouldSearch && !state.loading && state.error === null && data?.results.length === 0;
  const showResults =
    shouldSearch && !state.loading && state.error === null && (data?.results.length ?? 0) > 0;

  return (
    <section aria-labelledby="search-title" data-testid="search-page">
      <h1 id="search-title" className="text-3xl font-semibold tracking-tight text-ink">
        {copy.search.title}
      </h1>
      <p className="mt-2 max-w-prose text-ink-muted">{copy.search.description}</p>

      <label className="mt-6 flex flex-col gap-1 text-xs text-ink-muted">
        <span className="sr-only">{copy.search.inputLabel}</span>
        <input
          type="search"
          value={rawQuery}
          onChange={(e) => {
            setRawQuery(e.target.value);
          }}
          placeholder={copy.search.placeholder}
          aria-label={copy.search.inputLabel}
          autoComplete="off"
          data-testid="search-input"
          className={cn(
            'min-h-touch w-full rounded-card border border-ink-muted/30 bg-surface px-4 text-base text-ink',
            'placeholder:text-ink-muted focus-visible:border-brand focus-visible:outline-none',
          )}
        />
      </label>

      <div
        aria-live="polite"
        aria-busy={showLoading}
        aria-label={copy.search.ariaLiveRegion}
        data-testid="search-results"
        className="mt-6"
      >
        {!shouldSearch && trimmed.length === 0 && (
          <div data-testid="search-empty-initial">
            <EmptyState title={copy.search.emptyInitial} />
          </div>
        )}

        {!shouldSearch && trimmed.length > 0 && (
          <div data-testid="search-too-short">
            <EmptyState title={copy.search.tooShort} />
          </div>
        )}

        {showLoading && (
          <div
            className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5"
            data-testid="search-loading"
            aria-label={copy.search.loadingAria}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="border-transparent" />
            ))}
          </div>
        )}

        {showError && (
          <div data-testid="search-error">
            <ErrorState
              title={copy.errors.title}
              description={copy.errors.description}
              action={{
                label: copy.errors.retry,
                onClick: retry,
              }}
            />
          </div>
        )}

        {showEmptyResults && (
          <div data-testid="search-empty-results">
            <EmptyState title={copy.search.emptyResults} description={copy.search.noResultsHint} />
          </div>
        )}

        {showResults && data !== undefined && (
          <ul
            className="grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-5"
            data-testid="search-grid"
          >
            {data.results.map((m) => (
              <li key={m.id}>
                <MovieCard movie={m} imageConfig={config.data?.images} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
