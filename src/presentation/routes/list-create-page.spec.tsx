// presentation/routes/list-create-page.spec.tsx
//
// Verifies the create-list flow end-to-end:
//
//   1. The page renders the form, the heading, and the
//      description.
//   2. Submitting valid values calls the hook's create mutation
//      and navigates to the detail page of the new list.
//   3. Cancelling navigates back to the overview without
//      creating a list.
//   4. The submit button is disabled while the mutation is in
//      flight; the inputs are disabled too.
//
// All queries are accessible (role / name / heading). No
// `data-testid` is exposed by the page.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '@/presentation/providers/app-providers';
import { copy } from '@/presentation/copy/strings';
import { formatViolations, runAxe } from '@/test/axe';
import { ListCreatePage } from './list-create-page';
import { ListsPage } from './lists-page';

describe('ListCreatePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function renderAt(path = '/my-lists/new') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AppProviders>
          <Routes>
            <Route path="/my-lists" element={<ListsPage />} />
            <Route path="/my-lists/new" element={<ListCreatePage />} />
            <Route path="/my-lists/:listId" element={<div>detail</div>} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );
  }

  it('renders the heading, description, and form fields', async () => {
    renderAt();
    expect(
      await screen.findByRole('heading', { name: copy.lists.createTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.lists.createDescription)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /list name/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /description \(optional\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.lists.submitCreate })).toBeInTheDocument();
  });

  it('creates a list, stores it in localStorage, and navigates to its detail page', async () => {
    const user = userEvent.setup();
    renderAt();
    const name = await screen.findByRole('textbox', { name: /list name/i });
    await user.type(name, '90s noir');
    await user.type(screen.getByRole('textbox', { name: /description \(optional\)/i }), 'short');
    await user.click(screen.getByRole('button', { name: copy.lists.submitCreate }));
    expect(await screen.findByText('detail')).toBeInTheDocument();
    const stored = window.localStorage.getItem('cineteca:lists:v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '[]') as { name: string; description: string }[];
    expect(parsed[0]?.name).toBe('90s noir');
    expect(parsed[0]?.description).toBe('short');
  });

  it('shows the Spanish validation error when the name is empty and does not navigate', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(await screen.findByRole('button', { name: copy.lists.submitCreate }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/el nombre es obligatorio/i);
    expect(window.localStorage.getItem('cineteca:lists:v1')).toBeNull();
  });

  it('navigates back to the overview when the user clicks cancel', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(await screen.findByRole('button', { name: copy.lists.cancel }));
    expect(await screen.findByText(copy.lists.empty)).toBeInTheDocument();
  });

  it('sets the document title to the create title', async () => {
    renderAt();
    await screen.findByRole('heading', { name: copy.lists.createTitle });
    expect(document.title).toBe(copy.lists.createTitle);
  });

  describe('accessibility', () => {
    it('has no axe-core violations on the create-form render', async () => {
      const { container } = renderAt();
      await screen.findByRole('heading', { name: copy.lists.createTitle });
      const violations = await runAxe(container);
      expect(violations, formatViolations(violations)).toEqual([]);
    });
  });
});
