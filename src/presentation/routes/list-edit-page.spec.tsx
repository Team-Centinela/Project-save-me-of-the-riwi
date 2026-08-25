// presentation/routes/list-edit-page.spec.tsx
//
// Verifies the edit-list flow end-to-end (issue #82):
//
//   1. The form is pre-populated with the list's current values.
//   2. Submitting valid values persists the rename and navigates
//      back to the list detail page.
//   3. Submitting an invalid form reuses the create contract:
//      Spanish alert, focus on the first invalid field, no write.
//   4. Cancelling navigates back without writing.
//   5. An unknown list id renders the not-found state.
//
// All queries are accessible (role / name / heading). No
// `data-testid` is exposed by the page.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '@/presentation/providers/app-providers';
import { copy } from '@/presentation/copy/strings';
import { formatViolations, runAxe } from '@/test/axe';
import { ListDetailPage } from './list-detail-page';
import { ListEditPage } from './list-edit-page';

const LIST_ID = '11111111-1111-4111-8111-111111111111';

const storedList = {
  id: LIST_ID,
  name: '90s noir',
  description: 'short',
  movieIds: [27205],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('ListEditPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('cineteca:lists:v1', JSON.stringify([storedList]));
  });

  function renderAt(path = `/my-lists/${LIST_ID}/edit`) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AppProviders>
          <Routes>
            <Route path="/my-lists" element={<div>overview</div>} />
            <Route path="/my-lists/:listId" element={<ListDetailPage />} />
            <Route path="/my-lists/:listId/edit" element={<ListEditPage />} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );
  }

  it('renders the heading, description, and edit-mode submit button', async () => {
    renderAt();
    // Await a control that only exists once the list has loaded
    // (the loading skeleton renders an h1 with the same name).
    expect(await screen.findByRole('button', { name: copy.lists.submitEdit })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: copy.lists.editTitle })).toBeInTheDocument();
    expect(screen.getByText(copy.lists.editDescription)).toBeInTheDocument();
  });

  it('pre-populates the form with the list’s current name and description', async () => {
    renderAt();
    const name = await screen.findByRole('textbox', { name: /list name/i });
    expect(name).toHaveValue('90s noir');
    expect(screen.getByRole('textbox', { name: /description \(optional\)/i })).toHaveValue('short');
  });

  it('persists a rename and navigates back to the list detail page', async () => {
    const user = userEvent.setup();
    renderAt();
    const name = await screen.findByRole('textbox', { name: /list name/i });
    await user.clear(name);
    await user.type(name, '90s noir (rewatched)');
    await user.click(screen.getByRole('button', { name: copy.lists.submitEdit }));
    // Back on the detail page, which renders the new name.
    expect(
      await screen.findByRole('heading', { name: '90s noir (rewatched)', level: 1 }),
    ).toBeInTheDocument();
    await waitFor(() => {
      const parsed = JSON.parse(window.localStorage.getItem('cineteca:lists:v1') ?? '[]') as {
        name: string;
        movieIds: number[];
        createdAt: string;
      }[];
      expect(parsed[0]?.name).toBe('90s noir (rewatched)');
      // The fields the form does not own survive untouched.
      expect(parsed[0]?.movieIds).toEqual([27205]);
      expect(parsed[0]?.createdAt).toBe(storedList.createdAt);
    });
  });

  it('shows the Spanish validation error on an invalid rename and does not navigate or persist', async () => {
    const user = userEvent.setup();
    renderAt();
    const name = await screen.findByRole('textbox', { name: /list name/i });
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: copy.lists.submitEdit }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/el nombre es obligatorio/i);
    expect(screen.getByRole('button', { name: copy.lists.submitEdit })).toBeInTheDocument();
    const parsed = JSON.parse(window.localStorage.getItem('cineteca:lists:v1') ?? '[]') as {
      name: string;
    }[];
    expect(parsed[0]?.name).toBe('90s noir');
  });

  it('keeps focus on the first invalid field after a failed submit', async () => {
    const user = userEvent.setup();
    renderAt();
    const name = await screen.findByRole('textbox', { name: /list name/i });
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: copy.lists.submitEdit }));
    await screen.findByRole('alert');
    expect(name).toHaveFocus();
  });

  it('navigates back to the detail page without writing when cancelled', async () => {
    const user = userEvent.setup();
    renderAt();
    const description = await screen.findByRole('textbox', {
      name: /description \(optional\)/i,
    });
    await user.type(description, 'typed');
    await user.click(screen.getByRole('button', { name: copy.lists.cancel }));
    expect(await screen.findByText(copy.lists.remove)).toBeInTheDocument();
    const parsed = JSON.parse(window.localStorage.getItem('cineteca:lists:v1') ?? '[]') as {
      description: string;
    }[];
    expect(parsed[0]?.description).toBe('short');
  });

  it('renders the not-found empty state for an unknown list id', async () => {
    renderAt('/my-lists/00000000-0000-4000-8000-000000000000/edit');
    expect(
      await screen.findByRole('heading', { name: copy.lists.notFoundTitle, level: 1 }),
    ).toBeInTheDocument();
  });

  it('sets the document title to "Edit list: {name}" once loaded', async () => {
    renderAt();
    await screen.findByRole('button', { name: copy.lists.submitEdit });
    expect(document.title).toBe(`${copy.lists.editTitle}: 90s noir`);
  });

  describe('accessibility', () => {
    it('has no axe-core violations on the edit-form render', async () => {
      const { container } = renderAt();
      await screen.findByRole('heading', { name: copy.lists.editTitle });
      const violations = await runAxe(container);
      expect(violations, formatViolations(violations)).toEqual([]);
    });
  });
});
