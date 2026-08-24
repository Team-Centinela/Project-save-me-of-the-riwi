// presentation/components/feature/list-form.spec.tsx
//
// Acceptance criteria from issue #16, exercised through the form
// surface area:
//
//   1. One Zod schema validates and types the form (the form
//      schema is the only source of the rules; the same schema
//      owns the Spanish messages and the TypeScript types).
//   2. Each rule has its own Spanish message ("El nombre es
//      obligatorio.", "La descripción no puede tener más de 20
//      caracteres.").
//   3. Submit is blocked while the parent's mutation is in
//      flight; the submit button reflects the pending state.
//   4. Errors are announced to screen readers (the error text
//      lives in a `role="alert"` region).
//   5. Focus moves to the first invalid field on submit
//      failure.
//
// All assertions use accessible role / name / label queries —
// the component does not expose any `data-testid` hook, so the
// tests are also the spec for that contract.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListForm } from './list-form';
import { LIST_FORM_DEFAULTS } from '@/domain/lists/list-form-schema';

describe('ListForm', () => {
  it('renders the create form with the expected fields by accessible name', () => {
    render(
      <ListForm
        mode="create"
        defaultValues={LIST_FORM_DEFAULTS}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isBusy={false}
      />,
    );
    expect(screen.getByRole('form', { name: /list creation form/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /list name/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /description \(optional\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create list/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders the edit form with the right submit label', () => {
    render(
      <ListForm
        mode="edit"
        defaultValues={{ name: '90s noir', description: 'short' }}
        onSubmit={vi.fn()}
        isBusy={false}
      />,
    );
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('submits trimmed values and triggers the onSubmit callback', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ListForm
        mode="create"
        defaultValues={LIST_FORM_DEFAULTS}
        onSubmit={onSubmit}
        isBusy={false}
      />,
    );

    const name = screen.getByRole('textbox', { name: /list name/i });
    const description = screen.getByRole('textbox', { name: /description \(optional\)/i });
    await user.type(name, '  90s noir  ');
    await user.type(description, '  short  ');
    await user.click(screen.getByRole('button', { name: /create list/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const firstCall = onSubmit.mock.calls[0];
    expect(firstCall?.[0]).toEqual({ name: '90s noir', description: 'short' });
  });

  it('shows the Spanish error message and focuses the name field when the name is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ListForm
        mode="create"
        defaultValues={LIST_FORM_DEFAULTS}
        onSubmit={onSubmit}
        isBusy={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /create list/i }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(/el nombre es obligatorio/i);
    expect(onSubmit).not.toHaveBeenCalled();
    // The first invalid field receives focus.
    const nameInput = screen.getByRole('textbox', { name: /list name/i });
    await waitFor(() => {
      expect(document.activeElement).toBe(nameInput);
    });
    expect(nameInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the Spanish error message when the name is longer than 50 characters', async () => {
    const user = userEvent.setup();
    render(
      <ListForm
        mode="create"
        defaultValues={{ name: 'a'.repeat(51), description: '' }}
        onSubmit={vi.fn()}
        isBusy={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /create list/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/el nombre no puede tener más de 50 caracteres/i);
  });

  it('shows the Spanish error message when the description is longer than 20 characters', async () => {
    const user = userEvent.setup();
    render(
      <ListForm
        mode="create"
        defaultValues={{ name: '90s noir', description: 'a'.repeat(21) }}
        onSubmit={vi.fn()}
        isBusy={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /create list/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/la descripción no puede tener más de 20 caracteres/i);
  });

  it('announces an explicit error message via the alert region when provided', () => {
    render(
      <ListForm
        mode="create"
        defaultValues={LIST_FORM_DEFAULTS}
        onSubmit={vi.fn()}
        isBusy={false}
        errorMessage="We could not create the list. Try again."
      />,
    );

    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((node) => /try again/i.test(node.textContent))).toBe(true);
  });

  it('disables every interactive control while the mutation is in flight', () => {
    render(
      <ListForm
        mode="create"
        defaultValues={{ name: '90s noir', description: 'short' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isBusy={true}
      />,
    );

    expect(screen.getByRole('textbox', { name: /list name/i })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: /description/i })).toBeDisabled();
    const submit = screen.getByRole('button', { name: /saving/i });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('invokes onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ListForm
        mode="create"
        defaultValues={LIST_FORM_DEFAULTS}
        onSubmit={vi.fn()}
        onCancel={onCancel}
        isBusy={false}
      />,
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('exposes the success message via a live region for screen readers', () => {
    const { container } = render(
      <ListForm
        mode="create"
        defaultValues={LIST_FORM_DEFAULTS}
        onSubmit={vi.fn()}
        isBusy={false}
        successMessage="List created"
      />,
    );
    // The success region is visually hidden (`sr-only`) but
    // still announced to assistive tech. Query by the test-id
    // attribute that the form assigns to the live region.
    const liveRegion = container.querySelector('[data-submitted]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveTextContent(/list created/i);
  });
});
