// presentation/components/feature/movie-card.tsx — the grid card.
//
// Three visual tiers, top to bottom:
//
//   1. Title       — the bold name of the movie, clamped to two lines.
//   2. Year        — the primary release year, or a placeholder
//                    dash when TMDB has no date. Future iterations
//                    may append the runtime; today's MovieSummary
//                    does not carry one.
//   3. Rating      — the average vote plus the vote count, or a
//                    placeholder when the rating is unknown.
//
// The poster area reserves the 2:3 aspect ratio via the
// `aspect-poster` class — the slot is sized before the image loads
// so the grid never reflows when the bytes arrive.

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { type ImageConfiguration, posterUrl } from '@/domain/configuration/image-configuration';
import { formatRatingAverage } from '@/domain/format/rating-average';
import { formatVoteCountCompact } from '@/domain/format/vote-count';
import { type MovieSummary } from '@/domain/movie/movie-summary';
import { matchMovieState } from '@/domain/movie/movie-state';
import { matchRatingReliability } from '@/domain/rating/rating-reliability';
import { cn } from '@/presentation/lib/cn';
import { copy } from '@/presentation/copy/strings';

export interface MovieCardProps {
  readonly movie: MovieSummary;
  readonly imageConfig: ImageConfiguration | undefined;
  /** A locale used by the rating formatters. Defaults to the user's
   *  locale so tests do not need a provider. */
  readonly locale?: string;
  /** Used by virtualized grids to give the cell a stable test id. */
  readonly testId?: string;
}

function formatYear(state: MovieSummary['state']): string {
  return matchMovieState(state, {
    released: (date) => String(date.getUTCFullYear()),
    unreleased: () => copy.movieCard.unreleased,
    unknown: () => copy.movieCard.noYear,
  });
}

function formatRating(
  rating: MovieSummary['rating'],
  locale: string,
): {
  label: string;
  kind: 'consolidated' | 'early' | 'unknown';
  value: number | null;
  votes: number | null;
} {
  return matchRatingReliability(rating, {
    consolidated: (votes, average) => ({
      label: formatRatingAverage(average, locale),
      kind: 'consolidated' as const,
      value: average,
      votes,
    }),
    early: (votes, average) => ({
      label: formatRatingAverage(average, locale),
      kind: 'early' as const,
      value: average,
      votes,
    }),
    unknown: () => ({
      label: copy.movieCard.noRating,
      kind: 'unknown' as const,
      value: null,
      votes: null,
    }),
  });
}

export function MovieCard({
  movie,
  imageConfig,
  locale = 'en-US',
  testId,
}: MovieCardProps): ReactNode {
  const year = formatYear(movie.state);
  const rating = formatRating(movie.rating, locale);
  const poster =
    imageConfig !== undefined
      ? posterUrl(imageConfig, movie.posterPath.kind === 'present' ? movie.posterPath.value : null)
      : null;
  // The ARIA label and the visual placeholder are sourced from
  // the copy module so the wording stays in one place. The card's
  // visual year slot uses the dash glyph; the accessible label
  // spells it out for screen readers.
  const yearForAria =
    movie.state.kind === 'released' || movie.state.kind === 'unreleased'
      ? year
      : copy.movieCard.noYearAria;
  const accessibleName = copy.movieCard.accessibleName(movie.title, yearForAria, rating.label);
  const hasPoster = poster !== null;
  const isUpcoming = movie.state.kind === 'unreleased';

  return (
    <Link
      to={`/movie/${String(movie.id)}`}
      aria-label={accessibleName}
      data-testid={testId ?? 'movie-card'}
      data-movie-id={movie.id}
      className={cn(
        'group flex h-full flex-col gap-2 rounded-card border border-transparent bg-surface-raised p-3',
        'transition-colors hover:border-brand/40 focus-visible:border-brand focus-visible:outline-none',
      )}
    >
      <div className="relative aspect-poster w-full overflow-hidden rounded-card bg-surface">
        {hasPoster ? (
          <img
            src={poster}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center text-xs text-ink-muted"
          >
            {copy.movieCard.noPoster}
          </div>
        )}
        {isUpcoming && (
          <span
            className="absolute left-2 top-2 inline-flex items-center rounded-full bg-status-unreleased/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-status-unreleased"
            aria-hidden
          >
            {copy.movieCard.unreleased}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-2 text-sm font-semibold text-ink" data-testid="movie-card-title">
          {movie.title}
        </h3>
        <p className="text-xs text-ink-muted" data-testid="movie-card-year">
          {year}
        </p>
        <p
          data-testid="movie-card-rating"
          data-rating-kind={rating.kind}
          className={cn(
            'text-rating font-semibold leading-(--text-rating--line-height)',
            rating.kind === 'consolidated' && 'text-status-released',
            rating.kind === 'early' && 'text-status-unreleased',
            rating.kind === 'unknown' && 'text-ink-muted',
          )}
        >
          {rating.label}
          {rating.votes !== null && (
            <span className="ml-1 text-xs font-normal text-ink-muted">
              ({formatVoteCountCompact(rating.votes, locale)})
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
