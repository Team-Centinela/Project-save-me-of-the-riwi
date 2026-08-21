// presentation/components/feature/movie-card.spec.tsx
//
// Verifies the three visual tiers (title, year, rating) and the
// poster URL pipeline (the image-configuration domain helper does
// the joining; this test asserts the card passes the right
// arguments and renders the right output).

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { released, unreleased, unknownMovieState } from '@/domain/movie/movie-state';
import { ratingReliability } from '@/domain/rating/rating-reliability';
import { type ImageConfiguration } from '@/domain/configuration/image-configuration';
import { MovieCard } from './movie-card';

const baseConfig: ImageConfiguration = {
  baseUrl: 'http://image.tmdb.org/t/p',
  secureBaseUrl: 'https://image.tmdb.org/t/p',
  posterSizes: ['w92', 'w185', 'w500'],
  backdropSizes: ['w300', 'w780'],
  profileSizes: ['w185'],
  stillSizes: ['w300'],
  logoSizes: ['w300'],
};

function makeMovie(overrides: Partial<MovieSummary> = {}): MovieSummary {
  return {
    id: 27205,
    title: 'Inception',
    overview: '',
    posterPath: { kind: 'present', value: '/abc.jpg' },
    backdropPath: { kind: 'absent' },
    state: released(new Date('2010-07-16T00:00:00Z')),
    rating: ratingReliability(30_000, 8.4),
    genreIds: [28, 12, 878],
    ...overrides,
  };
}

function renderCard(movie: MovieSummary, config: ImageConfiguration | undefined = baseConfig) {
  return render(
    <MemoryRouter>
      <MovieCard movie={movie} imageConfig={config} locale="en-US" />
    </MemoryRouter>,
  );
}

describe('MovieCard', () => {
  it('renders the three tiers: title, year, rating', () => {
    renderCard(makeMovie());

    expect(screen.getByTestId('movie-card-title')).toHaveTextContent('Inception');
    expect(screen.getByTestId('movie-card-year')).toHaveTextContent('2010');
    expect(screen.getByTestId('movie-card-rating')).toHaveTextContent('8.4');
  });

  it('builds the poster URL from the image configuration', () => {
    renderCard(makeMovie({ posterPath: { kind: 'present', value: '/abc.jpg' } }));

    const imgElement = document.querySelector('img');
    expect(imgElement).not.toBeNull();
    expect(imgElement?.getAttribute('src')).toBe('https://image.tmdb.org/t/p/w185/abc.jpg');
  });

  it('renders the "no poster" placeholder when the path is absent', () => {
    renderCard(makeMovie({ posterPath: { kind: 'absent' } }));
    expect(screen.getByText(/no poster/i)).toBeInTheDocument();
  });

  it('renders the year as a placeholder dash for unknown state', () => {
    renderCard(makeMovie({ state: unknownMovieState() }));
    expect(screen.getByTestId('movie-card-year')).toHaveTextContent('—');
  });

  it('renders "Upcoming" for an unreleased state', () => {
    renderCard(makeMovie({ state: unreleased(new Date('2099-12-31T00:00:00Z')) }));
    expect(screen.getByTestId('movie-card-year')).toHaveTextContent(/upcoming/i);
  });

  it('renders the "no rating" label when the rating is unknown', () => {
    renderCard(makeMovie({ rating: ratingReliability(0, 0) }));
    const ratingEl = screen.getByTestId('movie-card-rating');
    expect(ratingEl.dataset.ratingKind).toBe('unknown');
    expect(ratingEl).toHaveTextContent(/no rating/i);
  });

  it('flags early ratings in the rating data attribute', () => {
    renderCard(makeMovie({ rating: ratingReliability(10, 7.5) }));
    expect(screen.getByTestId('movie-card-rating').dataset.ratingKind).toBe('early');
  });

  it('links to the movie detail page', () => {
    renderCard(makeMovie({ id: 27205 }));
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/movie/27205');
  });

  it('has a meaningful accessible name', () => {
    renderCard(makeMovie({ title: 'Inception' }));
    expect(screen.getByRole('link', { name: /inception/i })).toBeInTheDocument();
  });
});
