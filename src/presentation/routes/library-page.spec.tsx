// presentation/routes/library-page.spec.tsx
//
// The library page has three states (loading collapses into the
// success/empty branch because the local fetch is fast):
//
//   1. empty    — the library has zero entries. A CTA to
//                 /explore is rendered.
//   2. success  — the saved movies are rendered as cards
//                 with a "remove" button under each.
//   3. corrupted notice — a one-time banner appears above
//                 the grid when the storage was reset.
//
// The acceptance criterion "Corrupted data in storage is
// discarded, not crash" is exercised at the repository level;
// this test asserts the page renders the empty state (not an
// error) when the storage was reset.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '@/presentation/providers/app-providers';
import { LibraryPage } from './library-page';

describe('LibraryPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function renderAt(path = '/my-cineteca') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AppProviders>
          <LibraryPage />
        </AppProviders>
      </MemoryRouter>,
    );
  }

  it('renders the heading and the empty state when the library is empty', async () => {
    renderAt();
    expect(await screen.findByRole('heading', { name: /my cineteca/i })).toBeInTheDocument();
    expect(await screen.findByTestId('library-empty')).toBeInTheDocument();
  });

  it('renders a CTA to /explore in the empty state', async () => {
    renderAt();
    const cta = await screen.findByTestId('library-explore-cta');
    expect(cta).toBeInTheDocument();
    expect(cta.getAttribute('href')).toBe('/explore');
  });

  it('renders the saved movies as cards when the library has entries', async () => {
    const entry = {
      id: 27205,
      title: 'Inception',
      originalTitle: 'Inception',
      overview: 'A thief.',
      releaseDate: '2010-07-16',
      releaseYear: 2010,
      posterPath: '/abc.jpg',
      backdropPath: '/bd.jpg',
      voteAverage: 8.4,
      voteCount: 30_000,
      genreIds: [28, 12, 878],
      savedAt: '2024-01-01T00:00:00.000Z',
    };
    window.localStorage.setItem('cineteca:library:v1', JSON.stringify([entry]));
    renderAt();
    expect(await screen.findByTestId('library-grid')).toBeInTheDocument();
    const items = screen.getAllByTestId('library-entry');
    expect(items.length).toBe(1);
    expect(items[0]?.getAttribute('data-entry-id')).toBe('27205');
  });

  it('removes a movie when the remove button is clicked (optimistic)', async () => {
    const entry = {
      id: 27205,
      title: 'Inception',
      originalTitle: 'Inception',
      overview: 'A thief.',
      releaseDate: '2010-07-16',
      releaseYear: 2010,
      posterPath: '/abc.jpg',
      backdropPath: '/bd.jpg',
      voteAverage: 8.4,
      voteCount: 30_000,
      genreIds: [28, 12, 878],
      savedAt: '2024-01-01T00:00:00.000Z',
    };
    window.localStorage.setItem('cineteca:library:v1', JSON.stringify([entry]));
    const user = userEvent.setup();
    renderAt();
    const grid = await screen.findByTestId('library-grid');
    expect(grid).toBeInTheDocument();
    await user.click(screen.getByTestId('library-remove'));
    await waitFor(() => {
      expect(screen.queryByTestId('library-grid')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('library-empty')).toBeInTheDocument();
  });

  it('does not crash when the storage is corrupted; shows the corrupted notice + empty state', async () => {
    // Pre-fill with a value that does NOT match the schema.
    window.localStorage.setItem('cineteca:library:v1', '{not json');
    renderAt();
    // The page reads, logs, resets, and lands in the empty state.
    // The corrupted notice is rendered because the read
    // returned `corrupted: true`.
    expect(await screen.findByTestId('library-corrupted-notice')).toBeInTheDocument();
    expect(await screen.findByTestId('library-empty')).toBeInTheDocument();
  });

  it('sets the document title to the library title', async () => {
    renderAt();
    await screen.findByTestId('library-page');
    expect(document.title).toBe('My Cineteca');
  });
});
