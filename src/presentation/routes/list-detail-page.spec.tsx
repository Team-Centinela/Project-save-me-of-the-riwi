// presentation/routes/list-detail-page.spec.tsx
//
// Verifies the list detail page renders the expected sections
// and that the add/remove actions update the list
// optimistically.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '@/presentation/providers/app-providers';
import { copy } from '@/presentation/copy/strings';
import { server } from '@/test/msw/server';
import { formatViolations, runAxe } from '@/test/axe';
import { ListDetailPage } from './list-detail-page';
import { ListsPage } from './lists-page';

const LIST_ID = '11111111-1111-4111-8111-111111111111';
const MOVIE_ID = 27205;

const baseList = (
  overrides: Partial<{
    id: string;
    name: string;
    description: string;
    movieIds: number[];
    createdAt: string;
    updatedAt: string;
  }> = {},
) => ({
  id: LIST_ID,
  name: '90s noir',
  description: 'short',
  movieIds: [MOVIE_ID],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  ...overrides,
});

const baseLibraryEntry = () => ({
  id: MOVIE_ID,
  title: 'Inception',
  originalTitle: 'Inception',
  overview: 'A thief who steals corporate secrets.',
  releaseDate: '2010-07-16',
  releaseYear: 2010,
  posterPath: '/abc.jpg',
  backdropPath: '/bd.jpg',
  voteAverage: 8.4,
  voteCount: 30_000,
  genreIds: [28, 12, 878],
  savedAt: '2024-01-01T00:00:00.000Z',
});

describe('ListDetailPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    server.use(
      http.get('https://api.themoviedb.org/3/configuration', () =>
        HttpResponse.json({
          images: {
            base_url: 'http://image.tmdb.org/t/p',
            secure_base_url: 'https://image.tmdb.org/t/p',
            poster_sizes: ['w92', 'w185', 'w500', 'w780', 'original'],
            backdrop_sizes: ['w300', 'w780', 'w1280', 'original'],
            profile_sizes: ['w45', 'w185', 'h632', 'original'],
            still_sizes: ['w92', 'w185', 'w300', 'original'],
            logo_sizes: ['w45', 'w92', 'w154', 'w185', 'w300', 'w500', 'original'],
          },
          change_keys: [],
        }),
      ),
    );
  });

  function renderAt(path = `/my-lists/${LIST_ID}`) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AppProviders>
          <Routes>
            <Route path="/my-lists" element={<ListsPage />} />
            <Route path="/my-lists/:listId" element={<ListDetailPage />} />
          </Routes>
        </AppProviders>
      </MemoryRouter>,
    );
  }

  function seedListAndLibrary(list = baseList(), entry = baseLibraryEntry()): void {
    window.localStorage.setItem('cineteca:lists:v1', JSON.stringify([list]));
    window.localStorage.setItem('cineteca:library:v1', JSON.stringify([entry]));
  }

  it('renders the not-found empty state when the list id is unknown', async () => {
    renderAt('/my-lists/00000000-0000-4000-8000-000000000000');
    expect(
      await screen.findByRole('heading', { name: copy.lists.notFoundTitle, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.lists.notFoundBody)).toBeInTheDocument();
  });

  it('renders the list name, the back link, and the delete button', async () => {
    seedListAndLibrary();
    renderAt();
    expect(await screen.findByRole('heading', { name: '90s noir', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to my lists/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.lists.remove })).toBeInTheDocument();
  });

  it('shows the movie in the list section and an empty "available to add" section when the library only has that movie', async () => {
    seedListAndLibrary();
    renderAt();
    const cards = await screen.findAllByRole('link', { name: /inception/i });
    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(copy.lists.libraryMoviesHeading)).toBeInTheDocument();
  });

  it('removes the movie from the list optimistically when the user clicks the remove button', async () => {
    const user = userEvent.setup();
    seedListAndLibrary();
    renderAt();
    await screen.findByText(copy.lists.libraryMoviesHeading);
    const removeButtons = await screen.findAllByRole('button', {
      name: new RegExp(`^${copy.lists.removeMovie}: Inception$`),
    });
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
    await user.click(removeButtons[0]!);
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('cineteca:lists:v1') ?? '[]') as {
        movieIds: number[];
      }[];
      expect(stored[0]?.movieIds).toEqual([]);
    });
  });

  it('adds a movie to the list optimistically when the user clicks the add button', async () => {
    const user = userEvent.setup();
    seedListAndLibrary(baseList({ movieIds: [] }), baseLibraryEntry());
    renderAt();
    const addButton = await screen.findByRole('button', {
      name: new RegExp(`^${copy.lists.addMovie}: Inception$`),
    });
    await user.click(addButton);
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('cineteca:lists:v1') ?? '[]') as {
        movieIds: number[];
      }[];
      expect(stored[0]?.movieIds).toEqual([MOVIE_ID]);
    });
  });

  it('navigates back to the overview when the user clicks the delete list button', async () => {
    const user = userEvent.setup();
    seedListAndLibrary();
    renderAt();
    await user.click(await screen.findByRole('button', { name: copy.lists.remove }));
    expect(await screen.findByText(copy.lists.empty)).toBeInTheDocument();
    const stored = window.localStorage.getItem('cineteca:lists:v1');
    const parsed = stored === null ? [] : (JSON.parse(stored) as unknown[]);
    expect(parsed).toEqual([]);
  });

  it('sets the document title to the list name on a successful render', async () => {
    seedListAndLibrary();
    renderAt();
    await screen.findByRole('heading', { name: '90s noir', level: 1 });
    expect(document.title).toBe(`${copy.lists.title}: 90s noir`);
  });

  it('sets the document title to "List not found" when the list is missing', async () => {
    // Regression: previously the title stayed on "Loading list"
    // after the not-found empty state rendered.
    renderAt('/my-lists/00000000-0000-4000-8000-000000000000');
    await screen.findByRole('heading', { name: copy.lists.notFoundTitle, level: 1 });
    expect(document.title).toBe(copy.lists.notFoundTitle);
  });

  describe('accessibility', () => {
    it('has no axe-core violations on the success render', async () => {
      seedListAndLibrary();
      const { container } = renderAt();
      await screen.findByRole('heading', { name: '90s noir', level: 1 });
      const violations = await runAxe(container);
      expect(violations, formatViolations(violations)).toEqual([]);
    });
  });
});
