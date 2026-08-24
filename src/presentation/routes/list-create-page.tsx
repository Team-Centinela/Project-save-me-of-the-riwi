// presentation/routes/list-create-page.tsx — the create-list
// screen at `/my-lists/new`.
//
// The page renders the create form and forwards the form values
// to `useLists.create`. On success the page navigates to the
// newly created list's detail page; on validation error the
// form's `onSubmitFailure` already moved focus to the first
// invalid field. The submit is blocked while the mutation is
// in-flight (the form's submit button shows the pending label
// and the inputs are disabled).

import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';
import { ListForm } from '@/presentation/components/feature/list-form';
import { buildListFromForm, generateListId } from '@/domain/lists/list-factory';
import { type ListFormValues, LIST_FORM_DEFAULTS } from '@/domain/lists/list-form-schema';
import { useDocumentTitle } from '@/presentation/hooks/use-document-title';
import { useLists } from '@/presentation/hooks/use-lists';
import { copy } from '@/presentation/copy/strings';

export function ListCreatePage(): ReactNode {
  const navigate = useNavigate();
  const lists = useLists();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);
  useDocumentTitle(copy.lists.createTitle);

  async function handleSubmit(values: ListFormValues): Promise<void> {
    setErrorMessage(undefined);
    try {
      const list = buildListFromForm(values, generateListId());
      const created = await lists.create(list);
      setSuccessMessage(copy.lists.submitSuccessCreate);
      void navigate(`/my-lists/${created.id}`);
    } catch {
      setErrorMessage(copy.lists.errorCreate);
    }
  }

  return (
    <section aria-labelledby="list-create-title" className="mx-auto flex max-w-xl flex-col gap-6">
      <header>
        <h1 id="list-create-title" className="text-3xl font-semibold text-ink">
          {copy.lists.createTitle}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{copy.lists.createDescription}</p>
      </header>
      <ListForm
        mode="create"
        defaultValues={LIST_FORM_DEFAULTS}
        onSubmit={handleSubmit}
        onCancel={() => {
          void navigate('/my-lists');
        }}
        isBusy={lists.isCreating}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    </section>
  );
}
