// presentation/routes/lists-page.tsx — the user's themed lists
// at `/my-lists`.
//
// Three states, on purpose:
//
//   1. loading  — skeletons that match the list-card silhouette
//                 so the page does not reflow when the bytes
//                 arrive.
//   2. error    — error state with a retry button.
//   3. empty    — the user has not created a list yet. The
//                 empty state shows a CTA to /my-lists/new.
//   4. success  — the lists, each as a clickable card that
//                 navigates to the detail page.
//
// A one-time `corrupted` banner is rendered above the grid when
// the storage was reset, so the user knows why their lists
// disappeared.

import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { ListCard } from '@/presentation/components/feature/list-card';
import { EmptyState } from '@/presentation/components/ui/empty-state';
import { ErrorState } from '@/presentation/components/ui/error-state';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { useDocumentTitle } from '@/presentation/hooks/use-document-title';
import { useLists } from '@/presentation/hooks/use-lists';
import { copy } from '@/presentation/copy/strings';

const SKELETON_CARD_COUNT = 4;

export function ListsPage(): ReactNode {
  const lists = useLists();
  useDocumentTitle(copy.lists.title);

  if (lists.isLoading) {
    return (
      <section aria-busy="true" aria-label={copy.lists.loadingAria}>
        <h1 className="text-3xl font-semibold text-ink">{copy.lists.title}</h1>
        <p className="mt-2 max-w-prose text-ink-muted">{copy.lists.description}</p>
        <div
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label={copy.lists.loadingAria}
        >
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-32 border-transparent" />
          ))}
        </div>
      </section>
    );
  }

  if (lists.isError) {
    return (
      <section>
        <h1 className="text-3xl font-semibold text-ink">{copy.lists.title}</h1>
        <div className="mt-6">
          <ErrorState title={copy.lists.error} description={copy.errors.description} />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="lists-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="lists-title" className="text-3xl font-semibold text-ink">
            {copy.lists.title}
          </h1>
          <p className="mt-2 max-w-prose text-ink-muted">{copy.lists.description}</p>
        </div>
        <Link
          to="/my-lists/new"
          className="inline-flex min-h-touch items-center justify-center rounded-card bg-brand px-5 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {copy.lists.createCta}
        </Link>
      </div>

      {lists.corrupted && (
        <div
          role="status"
          className="mt-4 rounded-card border border-status-unreleased/40 bg-status-unreleased/10 px-4 py-3 text-sm text-status-unreleased"
        >
          {copy.lists.corruptedNotice}
        </div>
      )}

      {lists.lists.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={copy.lists.empty} description={copy.lists.emptyHint} />
        </div>
      ) : (
        <ul className="mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {lists.lists.map((list) => (
            <li key={list.id}>
              <ListCard list={list} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
