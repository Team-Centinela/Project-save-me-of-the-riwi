// presentation/components/feature/list-form.tsx — the create / edit
// list form.
//
// One schema, one type, one source of truth: `listFormSchema`
// from `@/domain/lists/list-form-schema`. The schema is wired to
// react-hook-form through `@hookform/resolvers/zod`, so the
// runtime validator and the TypeScript type come from the same
// declaration. Each rule owns its own Spanish message; the schema
// is the only place a translator edits.
//
// Accessibility, by design (per the issue's acceptance criteria):
//
//   - Errors are surfaced in a `role="alert"` region so screen
//     readers announce them as soon as the form re-renders.
//   - The first invalid field receives focus on submit failure,
//     via react-hook-form's `setFocus`. Keyboard users land
//     exactly where the next action has to happen.
//   - `aria-invalid` and `aria-describedby` link each field to
//     its error message.
//   - Submit is blocked while the mutation is in-flight; the
//     submit button switches to a `pending` state and the `isBusy`
//     prop disables every interactive control in the form.
//   - A success region announces the result with `aria-live="polite"`,
//     so a screen reader reads "List created" after the page
//     would otherwise have rendered silently.
//
// The component is intentionally pure: it owns no data state
// beyond react-hook-form's own. The parent page supplies the
// `onSubmit` callback, which talks to `useLists` and navigates
// to the list detail page on success.

import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { type ListFormValues, listFormSchema } from '@/domain/lists/list-form-schema';
import { copy } from '@/presentation/copy/strings';

export interface ListFormProps {
  readonly mode: 'create' | 'edit';
  readonly defaultValues: ListFormValues;
  readonly onSubmit: (values: ListFormValues) => Promise<void> | void;
  readonly onCancel?: () => void;
  readonly isBusy: boolean;
  readonly errorMessage?: string | undefined;
  readonly successMessage?: string | undefined;
}

export function ListForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isBusy,
  errorMessage,
  successMessage,
}: ListFormProps): ReactNode {
  const nameId = useId();
  const descriptionId = useId();
  const nameErrorId = useId();
  const descriptionErrorId = useId();
  const formErrorId = useId();
  const formSuccessId = useId();
  const formAriaLabel = copy.lists.createAria;

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitted },
  } = useForm<ListFormValues>({
    resolver: zodResolver(listFormSchema),
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  });

  // Move focus to the first invalid field on submit failure. The
  // `setFocus` call only fires when `errors` is non-empty; the
  // schema enforces at most one error per field, and the
  // "first invalid" is whichever field has the earliest focus
  // order in the DOM (name comes first by design).
  function onSubmitFailure(): void {
    if (errors.name !== undefined) {
      setFocus('name');
    } else if (errors.description !== undefined) {
      setFocus('description');
    }
  }

  const submitLabel = mode === 'create' ? copy.lists.submitCreate : copy.lists.submitEdit;
  const pendingLabel = copy.lists.submitInFlight;

  return (
    <form
      aria-label={formAriaLabel}
      noValidate
      onSubmit={(event) => {
        void handleSubmit(onSubmit, onSubmitFailure)(event);
      }}
      className="flex flex-col gap-5 rounded-card border border-ink-muted/20 bg-surface-raised p-6"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className="text-sm font-medium text-ink">
          {copy.lists.nameLabel}
        </label>
        <input
          id={nameId}
          type="text"
          aria-invalid={errors.name !== undefined}
          aria-describedby={
            errors.name !== undefined ? `${nameErrorId} ${nameId}-help` : `${nameId}-help`
          }
          aria-required="true"
          maxLength={50}
          autoComplete="off"
          disabled={isBusy}
          {...register('name')}
          className="min-h-touch rounded-card border border-ink-muted/30 bg-surface px-3 text-base text-ink aria-[invalid=true]:border-danger focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p id={`${nameId}-help`} className="text-xs text-ink-muted">
          {copy.lists.nameHelp}
        </p>
        {errors.name !== undefined && (
          <p id={nameErrorId} role="alert" className="text-sm text-danger">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={descriptionId} className="text-sm font-medium text-ink">
          {copy.lists.descriptionLabel}
        </label>
        <textarea
          id={descriptionId}
          rows={2}
          aria-invalid={errors.description !== undefined}
          aria-describedby={
            errors.description !== undefined
              ? `${descriptionErrorId} ${descriptionId}-help`
              : `${descriptionId}-help`
          }
          maxLength={20}
          autoComplete="off"
          disabled={isBusy}
          {...register('description')}
          className="resize-none rounded-card border border-ink-muted/30 bg-surface px-3 py-2 text-base text-ink aria-[invalid=true]:border-danger focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p id={`${descriptionId}-help`} className="text-xs text-ink-muted">
          {copy.lists.descriptionHelp}
        </p>
        {errors.description !== undefined && (
          <p id={descriptionErrorId} role="alert" className="text-sm text-danger">
            {errors.description.message}
          </p>
        )}
      </div>

      <div role="status" aria-live="polite" className="min-h-0">
        {errorMessage !== undefined && errorMessage !== '' && (
          <p id={formErrorId} role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
      </div>

      <div
        id={formSuccessId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-submitted={isSubmitted}
      >
        {successMessage ?? ''}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel !== undefined && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="inline-flex min-h-touch items-center justify-center rounded-card border border-ink-muted/30 px-5 text-sm font-medium text-ink transition-colors hover:border-ink-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {copy.lists.cancel}
          </button>
        )}
        <button
          type="submit"
          disabled={isBusy}
          aria-busy={isBusy}
          className="inline-flex min-h-touch items-center justify-center rounded-card bg-brand px-5 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {isBusy ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
