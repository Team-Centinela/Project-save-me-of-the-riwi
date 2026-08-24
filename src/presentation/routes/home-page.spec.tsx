// presentation/routes/home-page.spec.tsx
//
// The Home page renders the weekly trending list and a CTA to
// the explore screen. It is gated on TMDB's `/trending/movie/week`
// endpoint. The four states are exercised here exactly the same
// way the explore page exercises them.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppProviders } from '@/presentation/providers/app-providers';
import { HomePage } from './home-page';
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

function renderAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <HomePage />
      </AppProviders>
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(async () => {
    const { __resetConfigurationCacheForTests } = await import('@/infrastructure/api');
    __resetConfigurationCacheForTests();
    server.resetHandlers();
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
      http.get('*/3/trending/movie/week', () =>
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

  it('sets the document title to the home title', async () => {
    renderAt();
    await screen.findByTestId('home-page');
    expect(document.title).toBe('Trending this week');
  });

  it('renders a heading with the home title', async () => {
    renderAt();
    expect(await screen.findByRole('heading', { name: /trending this week/i })).toBeInTheDocument();
  });

  it('renders a CTA to the explore screen', async () => {
    renderAt();
    const cta = await screen.findByTestId('home-explore-cta');
    expect(cta).toBeInTheDocument();
    expect(cta.getAttribute('href')).toBe('/explore');
  });

  it('renders the trending list when the API returns rows', async () => {
    server.use(
      http.get('*/3/trending/movie/week', () =>
        HttpResponse.json({
          page: 1,
          results: [
            sampleSummary({ id: 1, title: 'Inception' }),
            sampleSummary({ id: 2, title: 'The Matrix' }),
          ],
          total_pages: 1,
          total_results: 2,
        }),
      ),
    );

    renderAt();
    const grid = await screen.findByTestId('home-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.querySelectorAll('a[href^="/movie/"]').length).toBe(2);
  });

  describe('1. loading state', () => {
    it('renders skeletons that match the card silhouette', async () => {
      server.use(
        http.get('*/3/trending/movie/week', async () => {
          await new Promise((r) => setTimeout(r, 5_000));
          return HttpResponse.json({
            page: 1,
            results: [sampleSummary()],
            total_pages: 1,
            total_results: 1,
          });
        }),
      );
      renderAt();
      expect(await screen.findByTestId('home-loading')).toBeInTheDocument();
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(5);
      skeletons.forEach((sk) => {
        expect(sk.dataset.variant).toBe('card');
      });
    });
  });

  describe('2. error state', () => {
    it('renders an error state with a retry button when the API fails', async () => {
      let shouldFail = true;
      server.use(
        http.get('*/3/trending/movie/week', () => {
          if (shouldFail) {
            return HttpResponse.json({ status_message: 'boom' }, { status: 500 });
          }
          return HttpResponse.json({
            page: 1,
            results: [sampleSummary()],
            total_pages: 1,
            total_results: 1,
          });
        }),
      );
      renderAt();
      // Wait long enough for the query to fail and the retry to fire.
      await new Promise((r) => setTimeout(r, 100));
      const errorRegion = await screen.findByTestId('home-error', {}, { timeout: 5000 });
      expect(errorRegion).toBeInTheDocument();
      const retry = screen.getByRole('button', { name: /try again/i });
      shouldFail = false;
      server.use(
        http.get('*/3/trending/movie/week', () =>
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
        expect(screen.queryByTestId('home-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('3. empty state', () => {
    it('renders the empty state when the API returns no rows', async () => {
      server.use(
        http.get('*/3/trending/movie/week', () =>
          HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 }),
        ),
      );
      renderAt();
      const empty = await screen.findByTestId('home-empty');
      expect(empty).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has no axe-core violations on the success render', async () => {
      const { container } = renderAt();
      await screen.findByTestId('home-page');
      const violations = await runAxe(container);
      expect(violations, formatViolations(violations)).toEqual([]);
    });
  });
});
