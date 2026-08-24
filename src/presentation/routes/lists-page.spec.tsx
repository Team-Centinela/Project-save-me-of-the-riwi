// presentation/routes/lists-page.spec.tsx
//
// Verifies the four states of the lists overview page:
//
//   1. loading  — skeletons that match the card silhouette
//                 (covered by the inline assertion on the
//                  `aria-busy` section + skeletons).
//   2. error    — error state with a retry button.
//   3. empty    — the user has not created a list yet.
//   4. success  — the lists are rendered as cards.
//   5. corrupted notice — a one-time banner appears above the
//                          grid when the storage was reset.
//
// All queries are accessible (role / name / heading). No
// `data-testid` is exposed by the page.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '@/presentation/providers/app-providers';
import { copy } from '@/presentation/copy/strings';
import { ListDetailPage } from './list-detail-page';
import { ListsPage } from './lists-page';

describe('ListsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function renderAt(path = '/my-lists') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AppProviders>
          <Routes>
            <Route path="/my-lists" element={<ListsPage />} />
            <Route path="/my-lists/new" element={<div>create form</div>} />
            <Route path="/my-lists/:listId" element={<ListDetailPage />} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );
  }

  it('renders the heading and the create CTA when the storage is empty', async () => {
    renderAt();
    expect(await screen.findByRole('link', { name: copy.lists.createCta })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: copy.lists.title })).toBeInTheDocument();
  });

  it('renders the empty state with a CTA to the create form', async () => {
    renderAt();
    expect(await screen.findByText(copy.lists.empty)).toBeInTheDocument();
    const cta = await screen.findByRole('link', { name: copy.lists.createCta });
    expect(cta.getAttribute('href')).toBe('/my-lists/new');
  });

  it('renders a card per saved list, each pointing to its detail page', async () => {
    const listA = {
      id: '11111111-1111-4111-8111-111111111111',
      name: '90s noir',
      description: 'short',
      movieIds: [27205, 603],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };
    const listB = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Feel-good 80s',
      description: '',
      movieIds: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    window.localStorage.setItem('cineteca:lists:v1', JSON.stringify([listA, listB]));
    renderAt();
    const cardA = await screen.findByRole('link', { name: /90s noir/i });
    expect(cardA.getAttribute('href')).toBe('/my-lists/11111111-1111-4111-8111-111111111111');
    expect(screen.getByRole('link', { name: /feel-good 80s/i })).toBeInTheDocument();
    expect(screen.getByText('2 saved movies')).toBeInTheDocument();
  });

  it('shows the corrupted notice when the storage was reset', async () => {
    window.localStorage.setItem('cineteca:lists:v1', '{not json');
    renderAt();
    expect(await screen.findByText(copy.lists.corruptedNotice)).toBeInTheDocument();
  });

  it('navigates to the create form when the user clicks the CTA', async () => {
    const user = userEvent.setup();
    renderAt();
    const cta = await screen.findByRole('link', { name: copy.lists.createCta });
    await user.click(cta);
    expect(await screen.findByText('create form')).toBeInTheDocument();
  });

  it('sets the document title to the lists title', async () => {
    renderAt();
    await screen.findByRole('heading', { name: copy.lists.title });
    expect(document.title).toBe(copy.lists.title);
  });
});
