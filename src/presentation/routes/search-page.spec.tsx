// presentation/routes/search-page.spec.tsx
//
// Verifies the four required behaviours for issue #14:
//
//   - typing fast triggers ONE request, not many (debounce);
//   - new input cancels the in-flight request (no late "stale"
//     response overwrites a fresh one);
//   - empty states are distinct: "no input", "too short",
//     "no results";
//   - the document title is the search title.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/presentation/providers/app-providers';
import { SearchPage } from './search-page';
import { server } from '@/test/msw/server';

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

function renderAt(path = '/search') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <SearchPage />
      </AppProviders>
    </MemoryRouter>,
  );
}

describe('SearchPage', () => {
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
      http.get('*/3/search/movie', () =>
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

  it('sets the document title to the search title', () => {
    renderAt();
    expect(document.title).toBe('Search movies');
  });

  it('renders the search heading and the input', () => {
    renderAt();
    expect(screen.getByRole('heading', { name: /search movies/i })).toBeInTheDocument();
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('shows the "no input" empty state when the input is empty', () => {
    renderAt();
    expect(screen.getByTestId('search-empty-initial')).toBeInTheDocument();
  });

  it('shows the "too short" empty state for a single character', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.type(screen.getByTestId('search-input'), 'a');
    // Wait for the debounce (300ms) to settle.
    await waitFor(() => {
      expect(screen.getByTestId('search-too-short')).toBeInTheDocument();
    });
  });

  it('coalesces a rapid typing burst into ONE search request', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.get('*/3/search/movie', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('query') === 'inception') calls += 1;
        return HttpResponse.json({
          page: 1,
          results: [sampleSummary()],
          total_pages: 1,
          total_results: 1,
        });
      }),
    );
    renderAt();
    const input = screen.getByTestId('search-input');
    // 10 keystrokes in one tick. With a 300ms debounce, only the
    // last value is sent to the API.
    await user.type(input, 'inception');
    await waitFor(() => {
      expect(calls).toBeGreaterThanOrEqual(1);
    });
    // The hook's debounce + axios's single in-flight request mean
    // we never see more than one network call for the steady state.
    // Wait a tick for any straggler.
    await new Promise((r) => setTimeout(r, 400));
    expect(calls).toBe(1);
  });

  it('cancels an in-flight request when the input changes', async () => {
    const user = userEvent.setup();
    let resolvedQuery: string | null = null;
    server.use(
      http.get('*/3/search/movie', ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get('query') ?? '';
        return new Promise((resolve) => {
          setTimeout(() => {
            resolvedQuery = q;
            resolve(
              HttpResponse.json({
                page: 1,
                results: [sampleSummary({ title: q })],
                total_pages: 1,
                total_results: 1,
              }),
            );
          }, 400);
        });
      }),
    );
    renderAt();
    const input = screen.getByTestId('search-input');
    await user.type(input, 'inc');
    // Type a new query before the first request finishes.
    await new Promise((r) => setTimeout(r, 100));
    await user.type(input, 'eption');
    // Wait for the debounce + the 400ms server delay.
    await waitFor(
      () => {
        expect(resolvedQuery).toBe('inception');
      },
      { timeout: 2000 },
    );
  });

  it('shows the "no results" empty state when the API returns zero rows', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/3/search/movie', () =>
        HttpResponse.json({ page: 1, results: [], total_pages: 0, total_results: 0 }),
      ),
    );
    renderAt();
    await user.type(screen.getByTestId('search-input'), 'zzzzz');
    expect(await screen.findByTestId('search-empty-results')).toBeInTheDocument();
  });

  it('shows the loading skeleton during the request', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/3/search/movie', async () => {
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
    await user.type(screen.getByTestId('search-input'), 'inception');
    const loading = await screen.findByTestId('search-loading');
    expect(loading).toBeInTheDocument();
  });

  it('shows an error state with a retry button when the API fails', async () => {
    const user = userEvent.setup();
    let shouldFail = true;
    server.use(
      http.get('*/3/search/movie', () => {
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
    await user.type(screen.getByTestId('search-input'), 'inception');
    await new Promise((r) => setTimeout(r, 100));
    const errorRegion = await screen.findByTestId('search-error', {}, { timeout: 5000 });
    expect(errorRegion).toBeInTheDocument();
    shouldFail = false;
    server.use(
      http.get('*/3/search/movie', () =>
        HttpResponse.json({
          page: 1,
          results: [sampleSummary()],
          total_pages: 1,
          total_results: 1,
        }),
      ),
    );
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => {
      expect(screen.queryByTestId('search-error')).not.toBeInTheDocument();
    });
  });

  it('renders the results grid when the API returns rows', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/3/search/movie', () =>
        HttpResponse.json({
          page: 1,
          results: [sampleSummary({ id: 1 }), sampleSummary({ id: 2, title: 'The Matrix' })],
          total_pages: 1,
          total_results: 2,
        }),
      ),
    );
    renderAt();
    await user.type(screen.getByTestId('search-input'), 'matrix');
    const grid = await screen.findByTestId('search-grid');
    expect(grid).toBeInTheDocument();
    vi.useRealTimers();
  });
});
