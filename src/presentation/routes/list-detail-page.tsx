// presentation/routes/list-detail-page.tsx — the detail page
// for a single list at `/my-lists/:listId`.
//
// The page joins the list's `movieIds` against the user's local
// library so a single `MovieCard` per row is enough — the
// library is the source of truth for movie metadata. Movies in
// the list that are no longer in the library are dropped with a
// hint so the user knows why they disappeared (the library was
// corrupted and reset, the entry was deleted).
//
// The page renders three sections:
//
//   1. Header — the list name, the description (when present),
//      the "Updated at" line, a "back" link, and a "delete list"
//      button.
//
//   2. Movies in the list — one card per library entry whose id
//      is in the list, plus a "remove" action.
//
//   3. Your saved movies — every library entry NOT already in
//      the list, with an "add to list" action. The section
//      collapses to a hint when the library is empty or when
//      every saved movie is already in the list.

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { MovieCard } from '@/presentation/components/feature/movie-card';
import { ConfirmDialog } from '@/presentation/components/ui/confirm-dialog';
import { EmptyState } from '@/presentation/components/ui/empty-state';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { formatDateTime } from '@/domain/format/date-time';
import { entryToMovieSummary } from '@/domain/library/library-entry';
import { useDocumentTitle } from '@/presentation/hooks/use-document-title';
import { useImageConfig } from '@/presentation/hooks/use-image-config';
import { useLibrary } from '@/presentation/hooks/use-library';
import { useLists } from '@/presentation/hooks/use-lists';
import { useLocale } from '@/presentation/hooks/use-locale';
import { copy } from '@/presentation/copy/strings';

function parseId(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  if (raw.trim() === '') return null;
  return raw;
}

export function ListDetailPage(): ReactNode {
  const params = useParams();
  const navigate = useNavigate();
  const locale = useLocale();
  const config = useImageConfig();
  const library = useLibrary();
  const lists = useLists();
  const id = parseId(params.listId);
  // The destructive delete is guarded by a confirmation dialog
  // (issue #83): the button only opens the dialog; the actual
  // `lists.remove` fires from the dialog's confirm button.
  const [confirmOpen, setConfirmOpen] = useState(false);

  const list = useMemo(() => {
    if (id === null) return undefined;
    return lists.getList(id);
  }, [id, lists]);

  // The title mirrors the same branch that picks the body, so the
  // tab never lies. `id === null` and "list not found" both surface
  // the not-found title; the loading state surfaces the loading
  // title; the success state names the list.
  useDocumentTitle(
    id === null || (!lists.isLoading && list === undefined)
      ? copy.lists.notFoundTitle
      : lists.isLoading
        ? copy.lists.detailLoadingAria
        : `${copy.lists.title}: ${list.name}`,
  );

  const onRemove = useCallback(
    async (movieId: number): Promise<void> => {
      if (id === null) return;
      await lists.removeMovie(id, movieId);
    },
    [id, lists],
  );

  const onAdd = useCallback(
    async (movieId: number): Promise<void> => {
      if (id === null) return;
      await lists.addMovie(id, movieId);
    },
    [id, lists],
  );

  const onDelete = useCallback(async (): Promise<void> => {
    if (id === null) return;
    await lists.remove(id);
    void navigate('/my-lists');
  }, [id, lists, navigate]);

  if (id === null) {
    return (
      <section aria-labelledby="list-not-found-title">
        <h1 id="list-not-found-title" className="text-3xl font-semibold text-ink">
          {copy.lists.notFoundTitle}
        </h1>
        <div className="mt-6">
          <EmptyState title={copy.lists.notFoundTitle} description={copy.lists.notFoundBody} />
        </div>
      </section>
    );
  }

  if (lists.isLoading) {
    return (
      <section aria-busy="true" aria-label={copy.lists.detailLoadingAria}>
        <h1 className="text-3xl font-semibold text-ink">{copy.lists.title}</h1>
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton variant="text" className="h-8 w-1/2" />
          <Skeleton variant="block" className="h-40 w-full" />
        </div>
      </section>
    );
  }

  if (list === undefined) {
    return (
      <section aria-labelledby="list-not-found-title">
        <h1 id="list-not-found-title" className="text-3xl font-semibold text-ink">
          {copy.lists.notFoundTitle}
        </h1>
        <div className="mt-6">
          <EmptyState title={copy.lists.notFoundTitle} description={copy.lists.notFoundBody} />
        </div>
        <Link
          to="/my-lists"
          className="mt-6 inline-flex min-h-touch items-center justify-center rounded-card border border-ink-muted/30 px-5 text-sm font-medium text-ink transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {copy.lists.backToLists}
        </Link>
      </section>
    );
  }

  // Resolve movies: keep only entries that are in the local
  // library (the library is the source of truth for metadata).
  const inListEntries = library.entries.filter((entry) => list.movieIds.includes(entry.id));
  const notInListEntries = library.entries.filter((entry) => !list.movieIds.includes(entry.id));

  return (
    <article aria-labelledby="list-detail-title" className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          to="/my-lists"
          className="self-start text-sm text-ink-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-brand"
        >
          ← {copy.lists.backToLists}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="list-detail-title" className="text-3xl font-semibold text-ink">
              {list.name}
            </h1>
            {list.description !== '' && (
              <p className="mt-1 max-w-prose text-sm text-ink-muted">{list.description}</p>
            )}
            <p className="mt-1 text-xs text-ink-muted">
              {copy.lists.listUpdated(formatDateTime(list.updatedAt, locale))} ·{' '}
              {copy.lists.moviesCount(inListEntries.length)}
            </p>
          </div>
          <Link
            to={`/my-lists/${id}/edit`}
            className="inline-flex min-h-touch items-center justify-center rounded-card border border-ink-muted/30 px-5 text-sm font-medium text-ink transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {copy.lists.editTitle}
          </Link>
          <button
            type="button"
            onClick={() => {
              setConfirmOpen(true);
            }}
            disabled={lists.isRemoving}
            aria-label={copy.lists.remove}
            aria-haspopup="dialog"
            className="inline-flex min-h-touch items-center justify-center rounded-card border border-danger/40 px-5 text-sm font-medium text-danger transition-opacity hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {copy.lists.remove}
          </button>
        </div>
      </header>

      <section aria-labelledby="in-list-heading" className="flex flex-col gap-3">
        <h2 id="in-list-heading" className="text-lg font-semibold text-ink">
          {copy.lists.title}
        </h2>
        {inListEntries.length === 0 ? (
          <EmptyState
            title={copy.lists.noMoviesInList}
            description={copy.lists.noMoviesInLibraryHint}
          />
        ) : (
          <ul className="grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-5">
            {inListEntries.map((entry) => {
              const movie = entryToMovieSummary(entry);
              return (
                <li key={entry.id} className="flex flex-col gap-2">
                  <MovieCard movie={movie} imageConfig={config.data?.images} locale={locale} />
                  <p className="text-xs text-ink-muted">{copy.lists.movieAlreadyInList}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void onRemove(entry.id);
                    }}
                    disabled={lists.isRemovingMovie}
                    aria-label={`${copy.lists.removeMovie}: ${movie.title}`}
                    className="inline-flex min-h-touch w-full items-center justify-center rounded-card border border-ink-muted/30 bg-surface px-4 text-sm text-ink-muted transition-colors hover:border-danger/40 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy.lists.removeMovie}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="library-heading" className="flex flex-col gap-3">
        <h2 id="library-heading" className="text-lg font-semibold text-ink">
          {copy.lists.libraryMoviesHeading}
        </h2>
        {notInListEntries.length === 0 ? (
          <EmptyState
            title={copy.lists.noMoviesInLibraryHint}
            description={
              library.entries.length === 0 ? copy.library.emptyHint : copy.lists.noMoviesInList
            }
          />
        ) : (
          <ul className="grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 lg:grid-cols-5">
            {notInListEntries.map((entry) => {
              const movie = entryToMovieSummary(entry);
              return (
                <li key={entry.id} className="flex flex-col gap-2">
                  <MovieCard movie={movie} imageConfig={config.data?.images} locale={locale} />
                  <button
                    type="button"
                    onClick={() => {
                      void onAdd(entry.id);
                    }}
                    disabled={lists.isAddingMovie}
                    aria-label={`${copy.lists.addMovie}: ${movie.title}`}
                    className="inline-flex min-h-touch w-full items-center justify-center rounded-card border border-brand px-4 text-sm font-medium text-brand transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy.lists.addMovie}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title={copy.lists.deleteDialogTitle}
        body={`${copy.lists.removeConfirm} ${copy.lists.deleteDialogBody}`}
        confirmLabel={copy.lists.remove}
        confirmAriaLabel={`${copy.lists.remove}: ${list.name}`}
        onConfirm={() => {
          setConfirmOpen(false);
          void onDelete();
        }}
        onCancel={() => {
          setConfirmOpen(false);
        }}
      />
    </article>
  );
}
