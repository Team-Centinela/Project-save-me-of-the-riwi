// presentation/routes/explore-page.spec.tsx
//
// The four required states plus the URL-state and invalid-params
// acceptance criteria from issue #13:
//
//   1. loading  — skeletons matching the card silhouette.
//   2. error    — an error state with a retry button.
//   3. empty    — the API returns no rows AND no filter is active.
//   4. filtered — the API returns no rows AND a filter is active;
//                 the empty state shows a "Clear filters" button
//                 that rewrites the URL.
//
// Plus:
//   - Reload with filters in the URL restores the exact view
//     (verified by the URL → request URL roundtrip).
//   - A hand-typed invalid filter does not break the screen
//     (verified by the `hadInvalidParams` hint).

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '@/presentation/providers/app-providers';
import { ExplorePage } from './explore-page';
import { server } from '@/test/msw/server';
import { formatViolations, runAxe } from '@/test/axe';

const sampleSummary = (overrides: Record<string, unknown> = {}) => ({
  id: 27205,
  title: 'Inception',
  overview: '',
  poster_path: '/abc.jpg',
  backdrop_path: '/bd.jpg',
  release_date: '2010-07-16',
  vote_average: 8.4,
  vote_count: 30_000,
  genre_ids: [28, 12, 878],
  ...overrides,
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <ExplorePage />
      </AppProviders>
    </MemoryRouter>,
  );
}

describe('ExplorePage', () => {
  beforeEach(async () => {
    // The configuration cache is process-lifetime. Reset it so each
    // test gets a fresh `/configuration` fetch.
    const { __resetConfigurationCacheForTests } = await import('@/infrastructure/api');
    __resetConfigurationCacheForTests();
    server.resetHandlers();
    // Default handlers: every endpoint the page touches returns a
    // realistic response. Tests override the discover handler as
    // needed.
    server.use(
      http.get('*/3/configuration', () =>
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
      http.get('*/3/genre/movie/list', () =>
        HttpResponse.json({
          genres: [
            { id: 28, name: 'Action' },
            { id: 12, name: 'Adventure' },
            { id: 878, name: 'Science Fiction' },
          ],
        }),
      ),
      http.get('*/3/discover/movie', () =>
        HttpResponse.json({
          page: 1,
          results: [sampleSummary()],
          total_pages: 1,
          total_results: 1,
        }),
      ),
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('1. loading state', () => {
    it('renders skeletons matching the card silhouette', async () => {
      server.use(
        http.get('https://api.themoviedb.org/3/discover/movie', async () => {
          await new Promise((r) => setTimeout(r, 5_000));
          return HttpResponse.json({
            page: 1,
            results: [sampleSummary()],
            total_pages: 1,
            total_results: 1,
          });
        }),
      );

      renderAt('/explore');
      expect(await screen.findByTestId('explore-loading')).toBeInTheDocument();
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(5);
      skeletons.forEach((sk) => {
        expect(sk.dataset.variant).toBe('card');
      });
    });
  });

  describe('2. error state', () => {
    it('renders an error state with a retry button when the API fails', async () => {
      let attempts = 0;
      server.use(
        http.get('https://api.themoviedb.org/3/discover/movie', () => {
          attempts += 1;
          // Always fail — TanStack Query retries once with a
          // backoff, so the test sees two attempts and the error
          // state survives long enough to be asserted.
          return HttpResponse.json({ status_message: 'boom' }, { status: 500 });
        }),
      );

      renderAt('/explore');
      // Give the query time to fail and the retry to fire so the
      // error state is visible at the time of the assertion.
      await new Promise((r) => setTimeout(r, 100));
      const errorRegion = await screen.findByTestId('explore-error', {}, { timeout: 5000 });
      expect(errorRegion).toBeInTheDocument();
      const retry = screen.getByRole('button', { name: /try again/i });

      // Swap the handler to a success response and click retry.
      server.use(
        http.get('https://api.themoviedb.org/3/discover/movie', () =>
          HttpResponse.json({
            page: 1,
            results: [sampleSummary()],
            total_pages: 1,
            total_results: 1,
          }),
        ),
      );
      await userEvent.setup().click(retry);
      await waitFor(() => {
        expect(screen.queryByTestId('explore-error')).not.toBeInTheDocument();
      });
      expect(attempts).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. initial empty state', () => {
    it('renders the empty state with NO clear button when there is no filter', async () => {
      server.use(
        http.get('https://api.themoviedb.org/3/discover/movie', () =>
          HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 }),
        ),
      );

      renderAt('/explore');
      const empty = await screen.findByTestId('explore-empty');
      expect(empty).toBeInTheDocument();
      // No "clear filters" button when no filter is active.
      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    });
  });

  describe('4. empty by filter state', () => {
    it('renders the empty state with a "Clear filters" button when a filter is active', async () => {
      server.use(
        http.get('https://api.themoviedb.org/3/discover/movie', () =>
          HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 }),
        ),
      );

      renderAt('/explore?genre=28');
      const empty = await screen.findByTestId('explore-empty');
      expect(empty).toBeInTheDocument();
      const clear = await screen.findByRole('button', { name: /clear filters/i });
      await userEvent.setup().click(clear);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('happy path', () => {
    it('calls the discover endpoint and renders the grid container', async () => {
      let called = false;
      server.use(
        http.get('https://api.themoviedb.org/3/discover/movie', () => {
          called = true;
          return HttpResponse.json({
            page: 1,
            results: [sampleSummary({ id: 1 }), sampleSummary({ id: 2, title: 'The Matrix' })],
            total_pages: 1,
            total_results: 2,
          });
        }),
      );

      renderAt('/explore');
      const grid = await screen.findByTestId('movie-grid');
      expect(grid).toBeInTheDocument();
      await waitFor(() => {
        expect(called).toBe(true);
      });
    });

    it('sends the filters in the URL as query parameters', async () => {
      const captures: { url: URL | null } = { url: null };
      server.use(
        http.get('https://api.themoviedb.org/3/discover/movie', ({ request }) => {
          captures.url = new URL(request.url);
          return HttpResponse.json({
            page: 1,
            results: [sampleSummary()],
            total_pages: 1,
            total_results: 1,
          });
        }),
      );

      renderAt('/explore?genre=28&year=2024&minRating=7&minVotes=100&sort=vote_average.desc');
      await screen.findByTestId('movie-grid');
      const url = captures.url;
      if (url === null) throw new Error('expected the discover endpoint to be called');
      const params = url.searchParams;
      expect(params.get('with_genres')).toBe('28');
      expect(params.get('primary_release_year')).toBe('2024');
      expect(params.get('vote_average.gte')).toBe('7');
      expect(params.get('vote_count.gte')).toBe('100');
      expect(params.get('sort_by')).toBe('vote_average.desc');
    });
  });

  describe('reload restores the exact view', () => {
    it('uses the filter from the URL to issue the right request', async () => {
      const captures: { url: URL | null } = { url: null };
      server.use(
        http.get('https://api.themoviedb.org/3/discover/movie', ({ request }) => {
          captures.url = new URL(request.url);
          return HttpResponse.json({
            page: 1,
            results: [sampleSummary()],
            total_pages: 1,
            total_results: 1,
          });
        }),
      );

      renderAt('/explore?genre=878&year=1999&sort=release_date.desc');
      await screen.findByTestId('movie-grid');
      const url = captures.url;
      if (url === null) throw new Error('expected the discover endpoint to be called');
      const params = url.searchParams;
      expect(params.get('with_genres')).toBe('878');
      expect(params.get('primary_release_year')).toBe('1999');
      expect(params.get('sort_by')).toBe('release_date.desc');
    });
  });

  describe('invalid URL params', () => {
    it('falls back to defaults and shows a hint when at least one param is out of range', async () => {
      server.use(
        http.get('https://api.themoviedb.org/3/discover/movie', () =>
          HttpResponse.json({
            page: 1,
            results: [sampleSummary()],
            total_pages: 1,
            total_results: 1,
          }),
        ),
      );

      renderAt('/explore?minRating=99&year=-1');
      const hint = await screen.findByTestId('invalid-params-hint');
      expect(hint).toBeInTheDocument();
      // The screen still renders the grid (it does not crash).
      expect(screen.getByTestId('movie-grid')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has no axe-core violations on the success render', async () => {
      const { container } = renderAt('/explore');
      await screen.findByTestId('movie-grid');
      const violations = await runAxe(container);
      expect(violations, formatViolations(violations)).toEqual([]);
    });
  });
});
