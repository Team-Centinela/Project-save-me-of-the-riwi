// presentation/routes/list-edit-page.tsx — the edit-list screen
// at `/my-lists/:listId/edit`.
//
// The page mirrors `list-create-page.tsx`: it renders the same
// `ListForm` in `mode="edit"`, pre-populated with the list's
// current values, and forwards valid values to
// `useLists.update`. On success it navigates back to the list's
// detail page; the repository stamps `updatedAt`, so this page
// only sends name and description.
//
// The unknown-id branch renders the same not-found empty state
// as the detail page — a stale link to an already-deleted list
// is a normal state, not an error.

import { type ReactNode, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ListForm } from '@/presentation/components/feature/list-form';
import { EmptyState } from '@/presentation/components/ui/empty-state';
import { Skeleton } from '@/presentation/components/ui/skeleton';
import { type ListFormValues } from '@/domain/lists/list-form-schema';
import { useDocumentTitle } from '@/presentation/hooks/use-document-title';
import { useLists } from '@/presentation/hooks/use-lists';
import { copy } from '@/presentation/copy/strings';

function parseId(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  if (raw.trim() === '') return null;
  return raw;
}

export function ListEditPage(): ReactNode {
  const params = useParams();
  const navigate = useNavigate();
  const lists = useLists();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);
  const id = parseId(params.listId);

  const list = id === null ? undefined : lists.getList(id);

  useDocumentTitle(
    list !== undefined ? `${copy.lists.editTitle}: ${list.name}` : copy.lists.editTitle,
  );

  const handleSubmit = useCallback(
    async (values: ListFormValues): Promise<void> => {
      if (id === null || list === undefined) return;
      setErrorMessage(undefined);
      try {
        // The repository owns `updatedAt`; a no-op (the list was
        // deleted in another tab) resolves with `undefined` per
        // the port contract and is surfaced as an error.
        const updated = await lists.update({
          ...list,
          name: values.name.trim(),
          description: values.description.trim(),
        });
        if (updated === undefined) throw new Error(copy.lists.errorEdit);
        setSuccessMessage(copy.lists.submitSuccessEdit);
        void navigate(`/my-lists/${id}`);
      } catch {
        setErrorMessage(copy.lists.errorEdit);
      }
    },
    [list, id, lists, navigate],
  );

  if (id === null || (!lists.isLoading && list === undefined)) {
    return (
      <section aria-labelledby="list-edit-not-found-title">
        <h1 id="list-edit-not-found-title" className="text-3xl font-semibold text-ink">
          {copy.lists.notFoundTitle}
        </h1>
        <div className="mt-6">
          <EmptyState title={copy.lists.notFoundTitle} description={copy.lists.notFoundBody} />
        </div>
      </section>
    );
  }

  if (lists.isLoading || list === undefined) {
    return (
      <section aria-busy="true" aria-label={copy.lists.detailLoadingAria}>
        <h1 className="text-3xl font-semibold text-ink">{copy.lists.editTitle}</h1>
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton variant="text" className="h-8 w-1/2" />
          <Skeleton variant="block" className="h-40 w-full" />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="list-edit-title" className="mx-auto flex max-w-xl flex-col gap-6">
      <header>
        <h1 id="list-edit-title" className="text-3xl font-semibold text-ink">
          {copy.lists.editTitle}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{copy.lists.editDescription}</p>
      </header>
      <ListForm
        mode="edit"
        defaultValues={{ name: list.name, description: list.description }}
        onSubmit={(values) => handleSubmit(values)}
        onCancel={() => {
          void navigate(`/my-lists/${id}`);
        }}
        isBusy={lists.isUpdating}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    </section>
  );
}
