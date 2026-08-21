// presentation/components/feature/movie-grid.spec.tsx
//
// Verifies the structural contract of the grid:
//
//   - The grid groups movies into rows for virtualization.
//   - The container is scrollable.
//   - The data attributes that the virtualizer relies on (row count,
//     column count) are present and correct.
//   - The component does not crash on edge cases (empty list, very
//     long list).
//
// jsdom does not implement real layout, so the virtualizer's
// windowing cannot be exercised here. The virtualization behaviour
// is owned by `@tanstack/react-virtual` and is covered by its own
// tests; we trust it to mount only the visible rows once the scroll
// element has a real height in the browser.

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ImageConfiguration } from '@/domain/configuration/image-configuration';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { released } from '@/domain/movie/movie-state';
import { ratingReliability } from '@/domain/rating/rating-reliability';
import { MovieGrid } from './movie-grid';

const baseConfig: ImageConfiguration = {
  baseUrl: 'http://image.tmdb.org/t/p',
  secureBaseUrl: 'https://image.tmdb.org/t/p',
  posterSizes: ['w92', 'w185', 'w500'],
  backdropSizes: ['w300', 'w780'],
  profileSizes: ['w185'],
  stillSizes: ['w300'],
  logoSizes: ['w300'],
};

function makeMovie(id: number, title: string): MovieSummary {
  return {
    id,
    title,
    overview: '',
    posterPath: { kind: 'absent' },
    backdropPath: { kind: 'absent' },
    state: released(new Date('2020-01-01T00:00:00Z')),
    rating: ratingReliability(100, 7.5),
    genreIds: [],
  };
}

function makeMovies(count: number): MovieSummary[] {
  return Array.from({ length: count }, (_, i) => makeMovie(i + 1, `Movie ${String(i + 1)}`));
}

describe('MovieGrid', () => {
  beforeEach(() => {
    // jsdom does not implement layout. Mock the size so the
    // ResizeObserver sees a deterministic value.
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 600,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an empty grid when there are no movies', () => {
    render(<MovieGrid movies={[]} imageConfig={baseConfig} locale="en-US" />);
    const grid = screen.getByTestId('movie-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.dataset.rowCount).toBe('0');
  });

  it('groups movies into rows for virtualization', () => {
    const movies = makeMovies(20);
    render(<MovieGrid movies={movies} imageConfig={baseConfig} locale="en-US" />);
    const grid = screen.getByTestId('movie-grid');
    // 600px client width falls into the `minWidth: 0` bucket (2 cols).
    expect(grid.dataset.columnCount).toBe('2');
    expect(grid.dataset.rowCount).toBe('10');
  });

  it('uses more columns on wider viewports', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 1400,
    });
    const movies = makeMovies(30);
    render(<MovieGrid movies={movies} imageConfig={baseConfig} locale="en-US" />);
    const grid = screen.getByTestId('movie-grid');
    // 1400px falls into the `minWidth: 1280` bucket (5 cols).
    expect(grid.dataset.columnCount).toBe('5');
    expect(grid.dataset.rowCount).toBe('6');
  });

  it('renders the container as scrollable', () => {
    render(<MovieGrid movies={makeMovies(5)} imageConfig={baseConfig} locale="en-US" />);
    const grid = screen.getByTestId('movie-grid');
    expect(grid.className).toMatch(/overflow-auto/);
  });

  it('reserves the full virtual height for a long list so the scrollbar is correct', () => {
    const movies = makeMovies(200);
    render(
      <MovieGrid movies={movies} imageConfig={baseConfig} locale="en-US" heightClass="h-96" />,
    );
    const grid = screen.getByTestId('movie-grid');
    expect(grid.dataset.rowCount).toBe('100');
    const inner = screen.getByTestId('movie-grid-inner');
    // The inner spacer height must be greater than zero so the
    // browser shows a real scrollbar; if it were 0 the virtualizer
    // would not have a scrollable surface to drive.
    const totalHeight = Number.parseInt(inner.style.height, 10);
    expect(Number.isFinite(totalHeight)).toBe(true);
    expect(totalHeight).toBeGreaterThan(0);
  });
});
